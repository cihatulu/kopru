-- KÖPRÜ — Tahsilat/iade kayıtlarında müşteri ve sipariş bilgisi
--
-- Cari ekstrede tahsilat satırları kullanıcının yazdığı serbest metinle
-- görünüyordu ("pt", "32000"). Hangi müşteriden, hangi sipariş için tahsil
-- edildiği anlaşılmıyordu.
--
-- NEDEN AÇIKLAMAYA GÖMÜLÜYOR, JOIN İLE OKUNMUYOR:
-- Perakendeci tahsilatı İSTEDİĞİ üreticinin carisinden düşebilir; bu bilinçli
-- bir iş kuralıdır. Dolayısıyla `transactions.order_id`, cariyi gören
-- üreticinin OLMAYAN bir siparişi işaret edebilir ve o üretici RLS gereği o
-- siparişi okuyamaz — gömme sorgusu boş döner. Bilgi bu yüzden kaydın kendisine
-- yazılır (A9'un denormalizasyon mantığı).
--
-- İmza değişmiyor; `create or replace` yeterli (kural 6).

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
  v_fin_id uuid;
  v_order public.orders%rowtype;
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
  v_label text;
  v_note text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if v_retailer is null then
    raise exception 'Sadece perakendeciler islem yapabilir.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Tutar 0 dan buyuk olmalidir.';
  end if;

  -- Sipariş verildiyse perakendecinin kendi siparişi olmalı.
  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id;
    if not found or v_order.retailer_org_id <> v_retailer then
      raise exception 'Gecersiz siparis ID.';
    end if;
  end if;

  -- Okunabilir başlık: yöntem + tür, ardından müşteri ve sipariş.
  v_label := case p_method
               when 'cash' then 'Nakit'
               when 'pos_own' then 'Bizim POS'
               when 'pos_manufacturer' then 'Uretici POS'
               when 'bank_transfer' then 'Havale/EFT'
               else p_method
             end
             || case when p_type = 'income' then ' tahsilati' else ' iadesi' end;

  if p_order_id is not null then
    v_label := v_label
      || coalesce(' - ' || nullif(btrim(coalesce(v_order.customer_name, '')), ''), '')
      || ' - Siparis #' || v_order.order_no;
  end if;

  if v_note is not null then
    v_label := v_label || ' (' || v_note || ')';
  end if;

  insert into public.finance_entries (
    retailer_org_id, kind, method, amount, description, order_id, manufacturer_org_id
  ) values (
    v_retailer,
    p_type::public.finance_kind,
    p_method::public.payment_method,
    p_amount,
    v_label,
    p_order_id,
    p_manufacturer_id
  ) returning id into v_fin_id;

  -- Üretici POS'undan tahsilat: para perakendecinin kasasına HİÇ girmez,
  -- doğrudan üreticiye gider; karşılığında cari borç azalır.
  --
  -- Hangi üreticinin carisinden düşüleceğine PERAKENDECİ karar verir; siparişin
  -- üreticisiyle aynı olmak ZORUNDA DEĞİLDİR. Alacak perakendecinindir.
  if p_method = 'pos_manufacturer' and p_type = 'income' then
    if p_manufacturer_id is null then
      raise exception 'Uretici POS u secildiyse uretici ID si zorunludur.';
    end if;

    select * into v_rel
      from public.relationships
     where manufacturer_org_id = p_manufacturer_id
       and retailer_org_id = v_retailer
       and status = 'active';

    if not found then
      raise exception 'Bu ureticiyle aranizda aktif bir iliski bulunmuyor.';
    end if;

    -- A8: deftere yalnız sahip veya muhasebeci yazar.
    if public.get_my_org_role() not in ('owner', 'accountant') then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;

    select t.balance_after into v_prev
      from public.transactions t
     where t.relationship_id = v_rel.id
     order by t.created_at desc, t.id desc
     limit 1
       for update;

    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id,
      type, amount, balance_after, order_id, description
    ) values (
      v_rel.id, v_rel.manufacturer_org_id, v_rel.retailer_org_id,
      'credit'::public.transaction_type,
      p_amount,
      coalesce(v_prev, 0) - p_amount,
      p_order_id,
      v_label
    );
  end if;

  return v_fin_id;
end;
$$;

grant execute on function public.add_finance_transaction(text, text, numeric, text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
