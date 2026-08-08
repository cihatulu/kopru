-- ledger_period_summary: sınırsız dönemde açılış bakiyesi ÇİFT SAYILIYORDU
--
-- HATA: Dönem seçilmemişken (p_from null) özet, gerçek bakiyenin iki katını
-- gösteriyordu — 108.000 ₺'lik bir cari 216.000 ₺ görünüyordu.
--
-- SEBEP: Açılış sorgusunun koşulu `(p_from is null or t.created_at < p_from)`
-- idi. `p_from` null olduğunda bu koşul TÜM satırlar için doğru olur ve sorgu
-- SON hareketin `balance_after` değerini "açılış" diye döndürür. Sonra kapanış
-- `açılış + borç − alacak` ile hesaplanınca aynı hareketler ikinci kez eklenir.
--
-- DOĞRUSU: Alt sınır yoksa "dönemden önce" diye bir şey yoktur; açılış sıfırdır.
-- Bu yüzden sorgu p_from null iken HİÇ çalıştırılmaz.
--
-- Ders: şema testleri sorgunun `balance_after` okuduğunu ve `SUM` kullanmadığını
-- doğruluyordu — ikisi de doğruydu. Yanlış olan SEMANTİKTİ ve onu ancak gerçek
-- veriyle çalışan bir çağrı gösterdi.

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

  v_out.opening_balance := 0;

  -- Yalnız alt sınır VARSA devir hesaplanır. Devir toplanarak değil, dönemden
  -- önceki son satırın `balance_after` değeriyle bulunur (A18) — tek indeks
  -- araması, geçmişin tamamı taranmaz.
  if p_from is not null then
    select coalesce(t.balance_after, 0) into v_out.opening_balance
      from public.transactions t
     where t.relationship_id = p_relationship_id
       and t.created_at < p_from
     order by t.created_at desc, t.id desc
     limit 1;
    v_out.opening_balance := coalesce(v_out.opening_balance, 0);
  end if;

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

notify pgrst, 'reload schema';
