-- KÖPRÜ — cari dönem özeti
--
-- Ekstre ekranı "bu ay ne girdi, ne çıktı, dönem başı bakiyem neydi" sorusuna
-- cevap veremiyordu. Bu üç sayı olmadan ekstre bir liste, mutabakat aracı değil.

create type public.ledger_summary as (
  opening_balance numeric(14,2),
  total_debit numeric(14,2),
  total_credit numeric(14,2),
  closing_balance numeric(14,2),
  entry_count int
);

/**
 * Belirli bir tarih aralığının cari özeti.
 *
 * A18 ile çelişmez: yasak olan GÜNCEL BAKİYEYİ `SUM()` ile hesaplamaktır —
 * o milyonlarca satırda tam tarama demektir ve `balance_after`'dan okunur.
 * Burada toplananlar SINIRLI bir dönemin satırlarıdır ve
 * `transactions_rel_idx (relationship_id, created_at desc, id desc)` indeksiyle
 * aralık taraması yapılır.
 *
 * Açılış bakiyesi de toplanarak DEĞİL, dönemden önceki son satırın
 * `balance_after` değeri okunarak bulunur — tek indeks araması.
 */
create or replace function public.ledger_period_summary(
  p_relationship_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns public.ledger_summary
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_out public.ledger_summary;
begin
  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Her iki taraf da GÖRÜR (üretici izler, perakendeci yazar — kilitli kural 8).
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id)
     and not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(t.balance_after, 0) into v_out.opening_balance
    from public.transactions t
   where t.relationship_id = p_relationship_id
     and (p_from is null or t.created_at < p_from)
   order by t.created_at desc, t.id desc
   limit 1;
  v_out.opening_balance := coalesce(v_out.opening_balance, 0);

  select
      coalesce(sum(case when t.type = 'debit'  then t.amount else 0 end), 0),
      coalesce(sum(case when t.type = 'credit' then t.amount else 0 end), 0),
      count(*)
    into v_out.total_debit, v_out.total_credit, v_out.entry_count
    from public.transactions t
   where t.relationship_id = p_relationship_id
     and (p_from is null or t.created_at >= p_from)
     and (p_to   is null or t.created_at <  p_to);

  -- Kapanış, açılıştan TÜRETİLİR; ayrı bir sorgu ile okunsaydı iki sayı
  -- birbirini tutmayabilirdi (aralarında yeni bir kayıt düşerse).
  v_out.closing_balance := v_out.opening_balance + v_out.total_debit - v_out.total_credit;

  return v_out;
end;
$$;

grant execute on function public.ledger_period_summary(uuid, timestamptz, timestamptz)
  to authenticated;

notify pgrst, 'reload schema';
