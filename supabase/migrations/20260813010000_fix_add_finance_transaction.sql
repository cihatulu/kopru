-- KÖPRÜ — add_finance_transaction düzeltmesi
--
-- Üretici POS tahsilatı, perakendecinin üreticiye olan borcunu azaltan bir
-- `credit` satırı yazar. Fonksiyonun ilk hâlinde bu yazımda dört sorun vardı:
--
--   1. İlişki araması TERS YÖNÜ de kabul ediyordu:
--        or (retailer_org_id = p_manufacturer_id and manufacturer_org_id = v_retailer)
--      Bu eşleşme tutarsa `transactions` satırına yazılan denormalize
--      `manufacturer_org_id`/`retailer_org_id` kolonları ilişkinin kendi
--      kolonlarının TERSİ olurdu. A9 gereği RLS tam olarak bu kolonlar
--      üzerinden eşitlikle çalışır — satır yanlış tarafa görünür, cari bozulur.
--      Artık ilişki tek yönde aranır ve kolonlar `v_rel`den alınır.
--
--   2. Hata mesajı "aktif bir iliski bulunmuyor" diyordu ama `status`
--      kontrol edilmiyordu; pasif ilişkiye kayıt yazılabiliyordu.
--
--   3. Yetki kontrolü yoktu. A8: cari işlemleri perakendeci tarafında
--      `owner` veya `accountant` yapar; `staff` deftere yazamaz.
--
--   4. `v_user` ve `v_role` tanımlanıp hiç kullanılmıyordu.
--
-- İmza DEĞİŞMEDİ (kilitli kural 6) — `create or replace` yeterli, DROP yok.

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

  insert into public.finance_entries (
    retailer_org_id, kind, method, amount, description, order_id, manufacturer_org_id
  ) values (
    v_retailer,
    p_type::public.finance_kind,
    p_method::public.payment_method,
    p_amount,
    p_description,
    p_order_id,
    p_manufacturer_id
  ) returning id into v_fin_id;

  -- Üretici POS'undan tahsilat: para perakendecinin kasasına HİÇ girmez,
  -- doğrudan üreticiye gider; karşılığında cari borç azalır.
  if p_method = 'pos_manufacturer' and p_type = 'income' then
    if p_manufacturer_id is null then
      raise exception 'Uretici POS u secildiyse uretici ID si zorunludur.';
    end if;

    -- TEK YÖN: çağıran perakendeci, karşı taraf üretici. Ters eşleşme yok.
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

    -- Önceki satırı kilitle ki eşzamanlı iki tahsilat aynı bakiyeyi
    -- yarıştırmasın (A18); bakiye SUM ile değil son satırdan okunur.
    select t.balance_after into v_prev
      from public.transactions t
     where t.relationship_id = v_rel.id
     order by t.created_at desc, t.id desc
     limit 1
       for update;

    -- A8: mevcut satırlara DOKUNULMAZ, dengeleyici yeni satır yazılır.
    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id,
      type, amount, balance_after, order_id, description
    ) values (
      v_rel.id, v_rel.manufacturer_org_id, v_rel.retailer_org_id,
      'credit'::public.transaction_type,
      p_amount,
      coalesce(v_prev, 0) - p_amount,
      p_order_id,
      coalesce(p_description, '') || ' (Uretici POS Tahsilati)'
    );
  end if;

  return v_fin_id;
end;
$$;

grant execute on function public.add_finance_transaction(text, text, numeric, text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
