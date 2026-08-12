-- Cariye elle kayıt: İKİ TARAF da girebilir, kim girdiği kayda yazılır
--
-- KİLİTLİ KURAL 8 DEĞİŞİYOR. Eski hali "cari revize/masraf/ödeme yalnız
-- perakendeci veya accountant tarafından yapılır; üretici izler" diyordu.
--
-- İş gerçeği bunun tersi: parayı TAHSİL EDEN üreticidir ve tahsilatı kendi
-- kaydeder ("Tahsilat / Ödeme Alındı"). Perakendecinin kendi ödemesini
-- kendisi beyan etmesi, karşı tarafın onayı olmadan bakiyeyi düşürmek
-- anlamına geliyordu.
--
-- Yeni kural: İKİ TARAF da elle kayıt girebilir (owner veya accountant), ama
-- her satır KİMİN girdiğini taşır. Paylaşılan bir defterde "bu tahsilatı kim
-- yazdı" sorusunun cevabı kayıtta olmalı; aksi halde anlaşmazlıkta kimse
-- ispat edemez. Ledger değişmezliği (A8) aynen korunuyor: düzeltme yine
-- dengeleyici yeni satırla yapılır.

alter table public.transactions
  add column if not exists created_by_org_id uuid references public.organizations(id),
  add column if not exists created_by_user_id uuid references public.users(id);

comment on column public.transactions.created_by_org_id is
  'Elle girilen kayıtlarda satırı giren org. Sipariş kaynaklı satırlarda null.';

drop function if exists public.add_manual_transaction(
  uuid, public.transaction_type, numeric, text
);

create or replace function public.add_manual_transaction(
  p_relationship_id uuid,
  p_type public.transaction_type,
  p_amount numeric,
  p_description text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
  v_row public.transactions%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if coalesce(btrim(p_description), '') = '' then
    raise exception 'DESCRIPTION_REQUIRED' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- İki taraf da yazabilir; ama YALNIZ tarafı olduğu ilişkiye.
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Son satır kilitlenir: iki kişi aynı anda yazarsa bakiye yarışmasın.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = p_relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, description, created_by_org_id, created_by_user_id
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, p_type, p_amount,
    coalesce(v_prev, 0) + (case when p_type = 'debit' then p_amount else -p_amount end),
    btrim(p_description), v_me, public.get_my_user_id()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.add_manual_transaction(
  uuid, public.transaction_type, numeric, text
) to authenticated;

-- ============================================================ hesap listesi

create type public.ledger_account_row as (
  relationship_id uuid,
  counterparty_org_id uuid,
  company_name text,
  vkn_tc text,
  total_debit numeric(14,2),
  total_credit numeric(14,2),
  balance numeric(14,2)
);

/**
 * Cari Hesaplar listesi — her ilişki için toplamlar ve güncel bakiye.
 *
 * Bakiye SUM ile hesaplanmaz (A18): ilişkinin SON satırındaki `balance_after`
 * okunur. Borç/alacak toplamları ise ekranda ayrı sütun olarak istenen gerçek
 * toplamlardır; ilişki başına sınırlı satır üzerinde çalışır ve
 * `transactions_rel_idx` indeksini kullanır.
 *
 * Yalnız AKTİF ilişkiler döner — pasif bir bayinin cari kartı listede
 * durmamalı, geçmişi ise ilişki yeniden açıldığında olduğu gibi geri gelir.
 */
create or replace function public.ledger_accounts_for_me()
returns setof public.ledger_account_row
language sql
security definer
stable
set search_path = public
as $$
  with me as (select public.get_my_org_id() as org_id, public.get_my_org_kind() as kind),
  edges as (
    select r.id,
           case when m.kind = 'manufacturer' then r.retailer_org_id else r.manufacturer_org_id end
             as counterparty_org_id
      from public.relationships r, me m
     where r.status = 'active'
       and (r.manufacturer_org_id = m.org_id or r.retailer_org_id = m.org_id)
  ),
  sums as (
    select t.relationship_id,
           coalesce(sum(case when t.type = 'debit'  then t.amount else 0 end), 0) as total_debit,
           coalesce(sum(case when t.type = 'credit' then t.amount else 0 end), 0) as total_credit
      from public.transactions t
     where t.relationship_id in (select id from edges)
     group by t.relationship_id
  ),
  last_row as (
    select distinct on (t.relationship_id) t.relationship_id, t.balance_after
      from public.transactions t
     where t.relationship_id in (select id from edges)
     order by t.relationship_id, t.created_at desc, t.id desc
  )
  select e.id,
         e.counterparty_org_id,
         o.company_name,
         o.vkn_tc,
         coalesce(s.total_debit, 0),
         coalesce(s.total_credit, 0),
         coalesce(l.balance_after, 0)
    from edges e
    join public.organizations o on o.id = e.counterparty_org_id
    left join sums s on s.relationship_id = e.id
    left join last_row l on l.relationship_id = e.id
   order by o.company_name;
$$;

grant execute on function public.ledger_accounts_for_me() to authenticated;

notify pgrst, 'reload schema';
