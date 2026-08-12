-- KÖPRÜ — Faz 7c: Duyuru görselleri ve hedef kitle desteği
--
-- 1. announcements tablosuna image_url ekle
alter table public.announcements add column if not exists image_url text;

-- 2. storage.buckets içine 'announcement-images' ekle
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-images',
  'announcement-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Okuma: herkese açık
drop policy if exists "announcement_images_public_read" on storage.objects;
create policy "announcement_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'announcement-images');

-- Yazma/silme: yalnız kendi org klasörüne
drop policy if exists "announcement_images_owner_write" on storage.objects;
create policy "announcement_images_owner_write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'announcement-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

drop policy if exists "announcement_images_owner_update" on storage.objects;
create policy "announcement_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'announcement-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

drop policy if exists "announcement_images_owner_delete" on storage.objects;
create policy "announcement_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'announcement-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

notify pgrst, 'reload schema';
