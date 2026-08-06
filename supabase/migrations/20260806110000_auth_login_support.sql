-- KÖPRÜ — Faz 3: giriş desteği
--
-- Supabase Auth e-posta ile çalışır, biz ise VKN/TCKN (user_code) ile giriş yaptırıyoruz.
-- Köprü: her kullanıcı için sentetik bir auth e-postası tutulur.
--
-- Neden türetmek yerine KOLON: e-postayı `user_code`'dan türetseydik kullanıcı kodu
-- değiştiğinde auth kaydıyla bağ kopardı (furniture-platform'da `${id}@platform.local`
-- deseni tam olarak bu kırılganlığı taşıyordu). Açık kolon bu bağı sabitler.

alter table public.users
  add column auth_email text not null unique
    check (auth_email ~ '^[a-z0-9._-]+@users\.kopru\.local$');

comment on column public.users.auth_email is
  'Supabase Auth için sentetik e-posta. Kullanıcı bunu asla görmez/girmez; giriş '
  'user_code (VKN/TCKN) + şifre iledir. Yalnız login Edge Function bu kolonu okur.';

-- Giriş kilidi sayacı zaten users tablosunda (failed_attempts, locked_until).
-- Sayaç YALNIZCA login Edge Function tarafından (service role) güncellenir;
-- istemcinin bu kolonlara yazma politikası yoktur.

-- Kilitli hesapların temizliği için indeks — süresi dolmuş kilitleri taramak ucuz olsun.
create index users_locked_idx on public.users (locked_until)
  where locked_until is not null;

-- ============================================================ giriş denetim kaydı
-- Başarısız girişler system_logs'a değil buraya yazılır: system_logs org bazlı
-- okunabilir, oysa başarısız giriş denemesi org'a sızdırılmamalı (kullanıcı
-- numaralandırma). Bu tabloyu yalnız platform admini görür.

create table public.login_audit (
  id uuid primary key default gen_random_uuid(),
  user_code text not null,
  portal public.org_kind,
  succeeded boolean not null,
  reason text,
  ip inet,
  created_at timestamptz not null default now()
);

alter table public.login_audit enable row level security;

create index login_audit_code_idx on public.login_audit (user_code, created_at desc);

create policy "login_audit_admin_only"
on public.login_audit for select to authenticated
using ((select public.is_platform_admin()));

revoke all on public.login_audit from anon;

notify pgrst, 'reload schema';
