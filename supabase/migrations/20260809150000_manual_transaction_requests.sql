-- Cari elle kayıt — onay akışı (KİLİTLİ KURAL 8 son hali)
--
-- Kural:
--   1. Yalnız ABONE org elle kayıt girebilir (owner veya accountant rolü).
--   2. Karşı taraf MİSAFİR → doğrudan transactions'a yazar (onay aranmaz;
--      misafirin paneli yoktur, onayı alınamaz).
--   3. Karşı taraf ABONE   → manual_transaction_requests'e düşer; karşı taraf
--      kendi panelinden onaylar veya reddeder. Reddedilirse defter etkilenmez.
--
-- Bu yaklaşım ledger değişmezliğini (A8) korur: onaylanmamış kayıt hiç
-- transactions'a girmez.
--
-- Ayrıca ledger_account_row tipine counterparty_is_subscriber ekleniyor:
-- frontend hangi modda çalışacağını (doğrudan / onay) önceden bilmeli.

-- ============================================================ 1. Tip güncelleme

drop function if exists public.ledger_accounts_for_me();
drop type   if exists public.ledger_account_row;

create type public.ledger_account_row as (
  relationship_id          uuid,
  counterparty_org_id      uuid,
  company_name             text,
  vkn_tc                   text,
  total_debit              numeric(14,2),
  total_credit             numeric(14,2),
  balance                  numeric(14,2),
  counterparty_is_subscriber boolean
);

create or replace function public.ledger_accounts_for_me()
returns setof public.ledger_account_row
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select public.get_my_org_id() as org_id,
           public.get_my_org_kind() as kind
  ),
  edges as (
    select r.id,
           case when m.kind = 'manufacturer'
                then r.retailer_org_id
                else r.manufacturer_org_id end as counterparty_org_id
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
    select distinct on (t.relationship_id)
           t.relationship_id, t.balance_after
      from public.transactions t
     where t.relationship_id in (select id from edges)
     order by t.relationship_id, t.created_at desc, t.id desc
  )
  select e.id,
         e.counterparty_org_id,
         o.company_name,
         o.vkn_tc,
         coalesce(s.total_debit,  0),
         coalesce(s.total_credit, 0),
         coalesce(l.balance_after, 0),
         o.is_subscriber
    from edges e
    join public.organizations o on o.id = e.counterparty_org_id
    left join sums     s on s.relationship_id = e.id
    left join last_row l on l.relationship_id = e.id
   order by o.company_name;
$$;

grant execute on function public.ledger_accounts_for_me() to authenticated;

-- ============================================================ 2. Bekleyen istek tablosu

create table if not exists public.manual_transaction_requests (
  id                 uuid primary key default gen_random_uuid(),
  relationship_id    uuid not null references public.relationships(id),
  requesting_org_id  uuid not null references public.organizations(id),
  requesting_user_id uuid not null references public.users(id),
  type               public.transaction_type not null,
  amount             numeric(14,2) not null check (amount > 0),
  description        text not null check (length(btrim(description)) >= 1),
  status             text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected')),
  created_at         timestamptz not null default now(),
  decided_at         timestamptz,
  decided_by_org_id  uuid references public.organizations(id),
  decided_by_user_id uuid references public.users(id)
);

create index if not exists mtr_rel_status_idx
  on public.manual_transaction_requests (relationship_id, status);

alter table public.manual_transaction_requests enable row level security;

-- Her iki taraf da kendi ilişkisine ait istekleri görebilir.
create policy "mtr_select"
  on public.manual_transaction_requests for select to authenticated
  using (
    exists (
      select 1 from public.relationships r
       where r.id = relationship_id
         and (r.manufacturer_org_id = public.get_my_org_id()
              or r.retailer_org_id  = public.get_my_org_id())
    )
  );

-- ============================================================ 3. request_manual_transaction RPC

drop function if exists public.request_manual_transaction(uuid, public.transaction_type, numeric, text);

create or replace function public.request_manual_transaction(
  p_relationship_id uuid,
  p_type            public.transaction_type,
  p_amount          numeric,
  p_description     text
)
returns jsonb  -- { "mode": "direct"|"pending", "id": uuid }
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := public.get_my_org_id();
  v_rel     public.relationships%rowtype;
  v_cp      public.organizations%rowtype;
  v_prev    numeric(14,2);
  v_new_tx  public.transactions%rowtype;
  v_req_id  uuid;
begin
  -- ── Girdi doğrulama ──────────────────────────────────────────────────────
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if coalesce(btrim(p_description), '') = '' then
    raise exception 'DESCRIPTION_REQUIRED' using errcode = '22023';
  end if;

  -- ── İlişki ve yetki ──────────────────────────────────────────────────────
  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_rel.status <> 'active' then
    raise exception 'RELATIONSHIP_NOT_ACTIVE' using errcode = '22023';
  end if;

  -- Sadece ilişkinin tarafı
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  -- Sadece owner veya accountant
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  -- Sadece abone org
  if not exists (
    select 1 from public.organizations where id = v_me and is_subscriber = true
  ) then
    raise exception 'SUBSCRIBER_ONLY' using errcode = '42501';
  end if;

  -- ── Karşı taraf ──────────────────────────────────────────────────────────
  select * into v_cp
    from public.organizations
   where id = case when v_me = v_rel.manufacturer_org_id
                   then v_rel.retailer_org_id
                   else v_rel.manufacturer_org_id end;

  -- ── Karşı taraf MİSAFİR → doğrudan yaz ──────────────────────────────────
  if not v_cp.is_subscriber then
    -- Son satırı kilitle: eşzamanlı iki yazım yarışmasın.
    select t.balance_after into v_prev
      from public.transactions t
     where t.relationship_id = p_relationship_id
     order by t.created_at desc, t.id desc
     limit 1
       for update;

    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id,
      type, amount, balance_after, description,
      created_by_org_id, created_by_user_id
    ) values (
      p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id,
      p_type, p_amount,
      coalesce(v_prev, 0) + (case when p_type = 'debit' then p_amount else -p_amount end),
      btrim(p_description), v_me, public.get_my_user_id()
    )
    returning * into v_new_tx;

    return jsonb_build_object('mode', 'direct', 'id', v_new_tx.id);
  end if;

  -- ── Karşı taraf ABONE → bekleyen istek oluştur ───────────────────────────
  insert into public.manual_transaction_requests (
    relationship_id, requesting_org_id, requesting_user_id,
    type, amount, description
  ) values (
    p_relationship_id, v_me, public.get_my_user_id(),
    p_type, p_amount, btrim(p_description)
  )
  returning id into v_req_id;

  return jsonb_build_object('mode', 'pending', 'id', v_req_id);
end;
$$;

grant execute on function public.request_manual_transaction(
  uuid, public.transaction_type, numeric, text
) to authenticated;

-- ============================================================ 4. decide_manual_transaction RPC

drop function if exists public.decide_manual_transaction(uuid, boolean);

create or replace function public.decide_manual_transaction(
  p_request_id uuid,
  p_approve    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := public.get_my_org_id();
  v_req public.manual_transaction_requests%rowtype;
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
begin
  -- İsteği kilitle
  select * into v_req
    from public.manual_transaction_requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_DECIDED' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships where id = v_req.relationship_id;

  -- Karar verebilecek: KARŞI TARAF (isteği açan değil)
  if v_me = v_req.requesting_org_id then
    raise exception 'CANNOT_DECIDE_OWN_REQUEST' using errcode = '42501';
  end if;
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Onaylanırsa transactions'a yaz
  if p_approve then
    select t.balance_after into v_prev
      from public.transactions t
     where t.relationship_id = v_req.relationship_id
     order by t.created_at desc, t.id desc
     limit 1
       for update;

    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id,
      type, amount, balance_after, description,
      created_by_org_id, created_by_user_id
    ) values (
      v_req.relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id,
      v_req.type, v_req.amount,
      coalesce(v_prev, 0) + (case when v_req.type = 'debit' then v_req.amount else -v_req.amount end),
      v_req.description, v_req.requesting_org_id, v_req.requesting_user_id
    );
  end if;

  -- İstek durumunu güncelle
  update public.manual_transaction_requests
     set status             = case when p_approve then 'approved' else 'rejected' end,
         decided_at         = now(),
         decided_by_org_id  = v_me,
         decided_by_user_id = public.get_my_user_id()
   where id = p_request_id;
end;
$$;

grant execute on function public.decide_manual_transaction(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
