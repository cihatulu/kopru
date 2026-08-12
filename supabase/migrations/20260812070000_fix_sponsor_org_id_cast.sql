-- ============================================================
-- get_my_sponsor_org_id() güvenli uuid cast
-- ============================================================
--
-- SORUN: Mevcut implementasyon coalesce() sonucunu direkt ::uuid ile cast
-- ediyor. Eğer JWT'de 'sponsor_org_id' alanı geçersiz bir string (boş değil
-- ama geçerli UUID formatında olmayan) içeriyorsa PostgreSQL EXCEPTION fırlatır.
-- Bu exception RLS içinde sessizce yakalanarak SELECT sıfır satır döndürür.
-- Sonuç: INSERT başarılı olsa da kullanıcı tablosunda hiçbir satır göremez.
--
-- ÇÖZÜM: EXCEPTION bloğu ile güvenli cast — geçersiz değerlerde NULL döner.

create or replace function public.get_my_sponsor_org_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_raw text;
  v_id  uuid;
begin
  v_raw := coalesce(
    auth.jwt() -> 'app_metadata' ->> 'sponsor_org_id',
    auth.jwt() ->> 'sponsor_org_id'
  );

  -- Boş string veya NULL → misafir değil, NULL döner
  if v_raw is null or v_raw = '' then
    return null;
  end if;

  -- Geçersiz UUID formatı → sessizce NULL döner (exception fırlatmaz)
  begin
    v_id := v_raw::uuid;
  exception when invalid_text_representation then
    return null;
  end;

  return v_id;
end;
$$;
