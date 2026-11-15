-- Manuel cari kaydı düzeltme/silme: üzerine yazma yerine TERS KAYIT (kural 7).
--
-- BULGU (16 Kasım 2026)
--   * Düzeltme satırın tutarını yerinde değiştiriyor, silme satırı yok ediyor,
--     ardından carinin tüm bakiyeleri baştan yazılıyordu. Geçmiş kayboluyordu.
--   * Silme fonksiyonu istemcilere açıktı ve yalnız "ilişkinin tarafı mısın"
--     diye bakıyordu: karşı taraf onayı (silme talebi akışı) ve rol kontrolü
--     doğrudan çağrıyla atlanabiliyordu. Düzeltmede de rol kontrolü yoktu.
--
-- YENİ DAVRANIŞ
--   * Sil     → aynı tutarda ters yönde "İptal" satırı EKLENİR.
--   * Düzelt  → iptal satırı + yeni değerlerle yeni satır, tek transaction.
--   * Bir kayıt en fazla bir kez iptal edilir; iptal satırı iptal edilemez.
--   * Rol: kayıt eklemedeki kuralın aynısı (tarafın owner/accountant'ı).
--   * Silme fonksiyonu yalnız içeriden (talep/onay akışı) çağrılır.
--
-- İmzalar değişmez (kural 6): create or replace.

-- 1) Hangi kaydı iptal ettiği. UNIQUE: aynı kayıt iki kez iptal edilemez;
--    aynı index FK'yi de kapsar.
alter table public.transactions
  add column if not exists reverses_transaction_id uuid references public.transactions(id);

create unique index if not exists transactions_reverses_uidx
  on public.transactions (reverses_transaction_id)
  where reverses_transaction_id is not null;

-- 2) Silme = ters kayıt.
create or replace function public.delete_manual_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me   uuid := public.get_my_org_id();
  v_tx   public.transactions%rowtype;
  v_prev numeric(14,2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_tx.order_id is not null then
    raise exception 'CANNOT_DELETE_ORDER_TRANSACTION' using errcode = '42501';
  end if;
  if v_tx.reverses_transaction_id is not null then
    raise exception 'CANNOT_REVERSE_REVERSAL' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.transactions r where r.reverses_transaction_id = p_transaction_id
  ) then
    raise exception 'ALREADY_REVERSED' using errcode = '22023';
  end if;

  if v_me not in (v_tx.manufacturer_org_id, v_tx.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Son satır kilitlenir: eşzamanlı yazımda bakiye yarışmasın.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_tx.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, description, created_by_org_id, created_by_user_id,
    reverses_transaction_id
  ) values (
    v_tx.relationship_id, v_tx.manufacturer_org_id, v_tx.retailer_org_id,
    case when v_tx.type = 'debit' then 'credit' else 'debit' end::public.transaction_type,
    v_tx.amount,
    coalesce(v_prev, 0) + (case when v_tx.type = 'debit' then -v_tx.amount else v_tx.amount end),
    'İptal: ' || v_tx.description, v_me, public.get_my_user_id(),
    v_tx.id
  );

  return true;
end;
$$;

-- İç yardımcı: istemci doğrudan çağıramaz (ERROR_PROTOCOLS #36). Çağıranlar
-- SECURITY DEFINER olduğu için etkilenmez: request_delete_manual_transaction,
-- decide_delete_manual_transaction, update_manual_transaction.
revoke execute on function public.delete_manual_transaction(uuid) from public, anon, authenticated;

-- 3) Düzeltme = iptal + yeni kayıt.
create or replace function public.update_manual_transaction(
  p_transaction_id uuid,
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
  v_me   uuid := public.get_my_org_id();
  v_tx   public.transactions%rowtype;
  v_new  public.transactions%rowtype;
  v_prev numeric(14,2);
begin
  -- Kolon numeric(14,2): tutar ve bakiye aynı sayıyla hesaplanmalı.
  p_amount := round(p_amount, 2);
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_description is null or length(trim(p_description)) = 0 then
    raise exception 'INVALID_DESCRIPTION' using errcode = '22023';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_tx.order_id is not null then
    raise exception 'CANNOT_EDIT_ORDER_TRANSACTION' using errcode = '42501';
  end if;

  -- Eski kayıt iptal edilir; taraf, rol, "zaten iptal" kontrolleri orada yapılır.
  perform public.delete_manual_transaction(p_transaction_id);

  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_tx.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  -- created_at: aynı transaction'da now() sabittir; yeni satır iptal satırından
  -- SONRA sıralanmalı, yoksa "son satır" okuması yanlış bakiyeyi görür.
  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, description, created_by_org_id, created_by_user_id, created_at
  ) values (
    v_tx.relationship_id, v_tx.manufacturer_org_id, v_tx.retailer_org_id, p_type, p_amount,
    coalesce(v_prev, 0) + (case when p_type = 'debit' then p_amount else -p_amount end),
    trim(p_description), v_me, public.get_my_user_id(),
    now() + interval '1 microsecond'
  )
  returning * into v_new;

  return v_new;
end;
$$;

-- 4) Bakiyeleri baştan yazan fonksiyon artık çağrılmıyor.
drop function if exists public.recalculate_relationship_balances(uuid);

notify pgrst, 'reload schema';
