-- KÖPRÜ — Finans Modülü Genişletmeleri
-- finance_entries tablosuna order_id ve manufacturer_org_id ekler
-- add_finance_transaction fonksiyonunu tanımlar

-- ─── Tablo Sütunları ──────────────────────────────────────────────────────────

alter table public.finance_entries
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists manufacturer_org_id uuid references public.organizations(id) on delete set null;

-- ─── Fonksiyon ───────────────────────────────────────────────────────────────

create or replace function public.add_finance_transaction(
  p_type text,
  p_method text,
  p_amount numeric,
  p_description text,
  p_order_id uuid default null,
  p_manufacturer_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retailer uuid := public.get_my_org_id();
  v_user uuid := public.get_my_user_id();
  v_role public.org_role := public.get_my_org_role();
  v_fin_id uuid;
  v_order public.orders%rowtype;
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
begin
  if v_retailer is null then
    raise exception 'Sadece perakendeciler islem yapabilir.';
  end if;
  if p_amount <= 0 then
    raise exception 'Tutar 0 dan buyuk olmalidir.';
  end if;

  -- Validate order if provided
  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id;
    if not found or v_order.retailer_org_id != v_retailer then
      raise exception 'Gecersiz siparis ID.';
    end if;
  end if;

  -- Insert finance transaction
  insert into public.finance_entries (
    retailer_org_id, kind, method, amount, description, order_id, manufacturer_org_id
  ) values (
    v_retailer, p_type::public.finance_kind, p_method::public.payment_method, p_amount, p_description, p_order_id, p_manufacturer_id
  ) returning id into v_fin_id;

  -- IF pos_manufacturer AND income -> Pay Manufacturer (Credit in transactions)
  if p_method = 'pos_manufacturer' and p_type = 'income' then
    if p_manufacturer_id is null then
      raise exception 'Uretici POS u secildiyse uretici ID si zorunludur.';
    end if;

    -- Find relationship
    select * into v_rel from public.relationships
     where (manufacturer_org_id = p_manufacturer_id and retailer_org_id = v_retailer)
        or (retailer_org_id = p_manufacturer_id and manufacturer_org_id = v_retailer)
     limit 1;

    if not found then
      raise exception 'Bu ureticiyle aranizda aktif bir iliski bulunmuyor.';
    end if;

    -- Get last transaction balance to calculate balance_after
    select t.balance_after into v_prev
      from public.transactions t
     where t.relationship_id = v_rel.id
     order by t.created_at desc, t.id desc
     limit 1
       for update;

    -- Insert credit ledger entry
    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id, type, amount, balance_after, order_id, description
    ) values (
      v_rel.id, p_manufacturer_id, v_retailer, 'credit'::public.transaction_type, p_amount, coalesce(v_prev, 0) - p_amount, p_order_id, coalesce(p_description, '') || ' (Uretici POS Tahsilati)'
    );
  end if;

  return v_fin_id;
end;
$$;

grant execute on function public.add_finance_transaction(text, text, numeric, text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
