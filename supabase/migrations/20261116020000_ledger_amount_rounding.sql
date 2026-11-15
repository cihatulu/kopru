-- Cari tutarı yuvarlama açığı: tutar ve bakiye aynı sayıyla hesaplanır.
--
-- BULGU (16 Kasım 2026): `transactions.amount` numeric(14,2) olduğu için yazılırken
-- 2 haneye yuvarlanıyor, ama bakiye (`balance_after`) YUVARLANMAMIŞ `p_amount` ile
-- hesaplanıyordu. Küsuratlı bir tutar (ör. 49.999,995) satıra 50.000,00 olarak,
-- bakiyeye 1 kuruş fazlasıyla yazılıyordu. 23.08.2026'daki bir "Üretici POS
-- tahsilatı" (sipariş peşinatı) bir carinin bakiyesini kalıcı olarak +0,01 TL
-- kaydırdı; sonraki her satır bu farkı taşıdı.
--
-- Çözüm:
--   1) Cariye tutar yazan üç RPC, `p_amount`'u gövdenin başında 2 haneye yuvarlar.
--      İmzalar DEĞİŞMEZ (kural 6) — create or replace yeterli; yetkiler korunur.
--   2) Kayan carilere 0 TL tutarlı dengeleyici satır eklenir (kural 7: geçmiş
--      satırlara UPDATE yok). Toplam tutar değişmez; güncel bakiye doğru sayıya döner.

-- 1) Tutar gövdenin başında yuvarlanır; doğrulama ve bakiye bu değerle çalışır.

CREATE OR REPLACE FUNCTION public.add_finance_transaction(p_type text, p_method text, p_amount numeric, p_description text, p_order_id uuid DEFAULT NULL::uuid, p_manufacturer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $$
declare
  v_retailer uuid := public.get_my_org_id();
  v_fin_id uuid;
  v_order public.orders%rowtype;
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
  v_label text;
  v_note text := nullif(btrim(coalesce(p_description, '')), '');
begin
  -- Kolon numeric(14,2): yuvarlanmamış tutar bakiyede 1 kuruş kayma üretiyordu.
  p_amount := round(p_amount, 2);
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

CREATE OR REPLACE FUNCTION public.add_manual_transaction(p_relationship_id uuid, p_type transaction_type, p_amount numeric, p_description text)
 RETURNS transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
  v_row public.transactions%rowtype;
begin
  -- Kolon numeric(14,2): yuvarlanmamış tutar bakiyede 1 kuruş kayma üretiyordu.
  p_amount := round(p_amount, 2);
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

CREATE OR REPLACE FUNCTION public.request_manual_transaction(p_relationship_id uuid, p_type transaction_type, p_amount numeric, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $$
declare
  v_me      uuid := public.get_my_org_id();
  v_rel     public.relationships%rowtype;
  v_cp      public.organizations%rowtype;
  v_prev    numeric(14,2);
  v_new_tx  public.transactions%rowtype;
  v_req_id  uuid;
begin
  -- Kolon numeric(14,2): yuvarlanmamış tutar bakiyede 1 kuruş kayma üretiyordu.
  p_amount := round(p_amount, 2);
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

-- 2) Dengeleyici kayıt: son satırın bakiyesi koşan toplamdan farklı olan her cari.
--    Tek seferlik onarım olduğu için burada toplam (SUM) kullanılır; boş ortamda
--    (db reset) hiçbir satır eklemez.
do $$
declare
  v_rec record;
begin
  for v_rec in
    with son as (
      select distinct on (t.relationship_id)
             t.relationship_id, t.manufacturer_org_id, t.retailer_org_id, t.balance_after
        from public.transactions t
       order by t.relationship_id, t.created_at desc, t.id desc
    ), dogru as (
      select t.relationship_id,
             sum(case when t.type = 'debit' then t.amount else -t.amount end) as bakiye
        from public.transactions t
       group by t.relationship_id
    )
    select son.*, dogru.bakiye
      from son join dogru using (relationship_id)
     where son.balance_after <> dogru.bakiye
  loop
    insert into public.transactions (
      relationship_id, manufacturer_org_id, retailer_org_id,
      type, amount, balance_after, description
    ) values (
      v_rec.relationship_id, v_rec.manufacturer_org_id, v_rec.retailer_org_id,
      'credit'::public.transaction_type, 0, v_rec.bakiye,
      format('Yuvarlama düzeltmesi: bakiye %s → %s TL (tutar yuvarlama farkı)',
             v_rec.balance_after, v_rec.bakiye)
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
