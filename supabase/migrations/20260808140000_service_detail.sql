-- KÖPRÜ — SSH detay: durum geçmişi, not ve fotoğraf
--
-- Şu ana kadar SSH talebinin YALNIZ güncel durumu vardı. "Ne zaman incelemeye
-- alındı, parça ne zaman gönderildi, kim ne not düştü" sorularının cevabı
-- hiçbir yerde durmuyordu — servis sürecinde taraflar arasındaki asıl
-- anlaşmazlık tam olarak budur.

-- ============================================================ durum geçmişi

create table public.ssh_status_logs (
  id uuid primary key default gen_random_uuid(),
  ssh_id uuid not null references public.ssh_requests(id) on delete cascade,

  -- RLS anahtarı denormalize taşınır (A16); ssh_requests'e join YAPILMAZ.
  manufacturer_org_id uuid not null,
  retailer_org_id uuid not null,

  -- İlk kayıtta from_status boştur: talep yoktan var olur.
  from_status public.ssh_status,
  to_status public.ssh_status not null,
  note text,

  actor_user_id uuid references public.users(id) on delete set null,
  actor_org_id uuid not null references public.organizations(id),
  created_at timestamptz not null default now()
);

alter table public.ssh_status_logs enable row level security;

create index ssh_logs_ssh_idx on public.ssh_status_logs (ssh_id, created_at, id);
create index ssh_logs_mfr_idx on public.ssh_status_logs (manufacturer_org_id, created_at desc);
create index ssh_logs_rtl_idx on public.ssh_status_logs (retailer_org_id, created_at desc);

create policy "ssh_logs_select_own_side"
on public.ssh_status_logs for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);
-- Yazma yalnız RPC'lerden; geçmiş istemciden yazılamaz.

revoke all on public.ssh_status_logs from anon;

-- ============================================================ ilişki üyeliği

-- Storage politikaları ilişki üyeliğini sorgulamak zorunda. `my_relationship_ids()`
-- küme döndürür ve her nesne kontrolünde materyalize olurdu (A16); tek satırlık
-- EXISTS kontrolü indexli eşitliğe iner.
create or replace function public.is_my_relationship(p_relationship_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.relationships r
     where r.id = p_relationship_id
       and (r.manufacturer_org_id = public.get_my_org_id()
         or r.retailer_org_id     = public.get_my_org_id())
  );
$$;

grant execute on function public.is_my_relationship(uuid) to authenticated;

-- ============================================================ fotoğraf deposu

-- Ürün görsellerinin aksine bu bucket PRIVATE. Servis fotoğrafı hasarlı ürünü,
-- çoğu zaman son müşterinin evini gösterir; herkese açık okuma kabul edilemez
-- (PLAN §17). Görüntüleme imzalı URL ile yapılır.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-photos', 'service-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Yol düzeni: <relationship_id>/<ssh_id>/<dosya>
-- İlk klasör ilişki kimliği OLMAK ZORUNDA — sahiplik kontrolü buna dayanır.
drop policy if exists "service_photos_party_read" on storage.objects;
create policy "service_photos_party_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'service-photos'
  and public.is_my_relationship(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "service_photos_party_write" on storage.objects;
create policy "service_photos_party_write"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-photos'
  and public.is_my_relationship(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "service_photos_party_delete" on storage.objects;
create policy "service_photos_party_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'service-photos'
  and public.is_my_relationship(((storage.foldername(name))[1])::uuid)
);

-- ============================================================ fotoğraf kaydı

create or replace function public.set_ssh_images(p_ssh_id uuid, p_paths text[])
returns public.ssh_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row public.ssh_requests%rowtype;
begin
  select * into v_row from public.ssh_requests where id = p_ssh_id for update;
  if not found then
    raise exception 'SSH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_me not in (v_row.manufacturer_org_id, v_row.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Kapalı talebe fotoğraf eklenmez; kapanmış bir servis kaydı değişmez.
  if v_row.status in ('tamamlandi', 'iptal') then
    raise exception 'SSH_CLOSED' using errcode = '22023';
  end if;

  if coalesce(array_length(p_paths, 1), 0) > 10 then
    raise exception 'TOO_MANY_IMAGES' using errcode = '22023';
  end if;

  update public.ssh_requests
     set images = coalesce(p_paths, '{}')
   where id = p_ssh_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_ssh_images(uuid, text[]) to authenticated;

-- ============================================================ durum + not

-- İMZA DEĞİŞİYOR: p_note eklendi. Kilitli kural 6 gereği önce DROP edilir,
-- overload bırakılmaz (PostgREST 409 ambiguous call).
drop function if exists public.advance_ssh_status(uuid, public.ssh_status);
drop function if exists public.advance_ssh_status(uuid, public.ssh_status, text);

create or replace function public.advance_ssh_status(
  p_id uuid,
  p_status public.ssh_status,
  p_note text default null
)
returns public.ssh_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row public.ssh_requests%rowtype;
  v_from public.ssh_status;
begin
  select * into v_row from public.ssh_requests where id = p_id for update;
  if not found then
    raise exception 'SSH_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Servis akışını ÜRETİCİ yürütür; perakendeci yalnız iptal edebilir.
  if p_status = 'iptal' then
    if v_me not in (v_row.manufacturer_org_id, v_row.retailer_org_id) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif v_row.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_row.status in ('tamamlandi', 'iptal') then
    raise exception 'SSH_CLOSED' using errcode = '22023';
  end if;

  -- ÖNCEKİ durum UPDATE'ten ÖNCE alınır. `returning * into v_row` sonrası
  -- v_row.status artık YENİ durumdur; oradan okumak her geçişi
  -- "bekliyor → bekliyor" diye kaydeder (aynı hata sipariş akışında yaşandı).
  v_from := v_row.status;

  update public.ssh_requests set status = p_status where id = p_id
  returning * into v_row;

  insert into public.ssh_status_logs
    (ssh_id, manufacturer_org_id, retailer_org_id, from_status, to_status, note,
     actor_user_id, actor_org_id)
  values
    (v_row.id, v_row.manufacturer_org_id, v_row.retailer_org_id, v_from, p_status,
     nullif(btrim(coalesce(p_note, '')), ''), public.get_my_user_id(), v_me);

  return v_row;
end;
$$;

grant execute on function public.advance_ssh_status(uuid, public.ssh_status, text) to authenticated;

-- ============================================================ açılış kaydı

-- Talep açılışı da geçmişin parçasıdır: "bekliyor" satırı olmadan zaman
-- çizelgesi ilk adımı eksik gösterirdi.
create or replace function public.log_ssh_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ssh_status_logs
    (ssh_id, manufacturer_org_id, retailer_org_id, from_status, to_status,
     actor_user_id, actor_org_id)
  values
    (new.id, new.manufacturer_org_id, new.retailer_org_id, null, new.status,
     public.get_my_user_id(), public.get_my_org_id());
  return new;
end;
$$;

create trigger ssh_requests_log_created
  after insert on public.ssh_requests
  for each row execute function public.log_ssh_created();

-- Mevcut taleplerin açılış kaydı geriye dönük yazılır; aksi halde eski
-- taleplerin zaman çizelgesi boş görünürdü.
insert into public.ssh_status_logs
  (ssh_id, manufacturer_org_id, retailer_org_id, from_status, to_status,
   actor_org_id, created_at)
select s.id, s.manufacturer_org_id, s.retailer_org_id, null, 'bekliyor',
       s.retailer_org_id, s.created_at
  from public.ssh_requests s
 where not exists (select 1 from public.ssh_status_logs l where l.ssh_id = s.id);

notify pgrst, 'reload schema';
