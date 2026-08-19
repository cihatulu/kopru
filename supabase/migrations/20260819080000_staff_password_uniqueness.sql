-- Ekip yönetimi için şifre benzersizliği kontrolü.
-- Aynı organizasyona bağlı personellerin şifrelerinin çakışmamasını (aynı olmamasını) denetler.
-- Supabase Auth içindeki hash'leri pgcrypto'nun crypt fonksiyonu ile doğrular.
create or replace function public.check_staff_password_conflict(
  p_org_id uuid,
  p_password text,
  p_exclude_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_conflict boolean := false;
BEGIN
  -- Organizasyondaki diğer kullanıcıların şifre hash'lerini çek
  FOR v_hash IN 
    SELECT au.encrypted_password 
    FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
    WHERE pu.org_id = p_org_id
      AND (p_exclude_user_id IS NULL OR pu.id <> p_exclude_user_id)
  LOOP
    IF v_hash IS NOT NULL AND v_hash <> '' THEN
      -- Dışarıdan gelen düz metin şifreyi mevcut hash ile karşılaştır
      IF extensions.crypt(p_password, v_hash) = v_hash THEN
        v_conflict := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_conflict;
END;
$$;

notify pgrst, 'reload schema';
