-- KÖPRÜ — Kapanmış davet satırı listeden kaldırılabiliyor
--
-- `revoke_invitation` daveti ÖLDÜRÜR ama satır listede kalır; kullanılmış
-- davetler de birikir. Ekran zamanla okunamaz hale geliyor ve kullanıcının
-- eski satırı temizlemek için hiçbir yolu yok.
--
-- KURAL 16'YA UYGUN: gerçek DELETE yalnız PASİFLEŞMİŞ kayıt için yapılır ve
-- yalnız kaydın sahibi org, yalnız `owner` rolüyle yapar.
--   · pasif = kullanılmış / iptal edilmiş / süresi dolmuş
--   · aktif (pending) davet SİLİNEMEZ — canlı bir bağlantıyı sessizce yok
--     etmek olurdu. Önce `revoke_invitation`, sonra silme.
--
-- İlişkiye dokunmaz: kabul edilmiş davetin kurduğu `relationships` satırı
-- ayrı yaşar, davet kaydı yalnız bir kayıttır. `used_by_org_id` FK'si
-- `on delete set null`; org tarafında hiçbir şey bozulmaz.
--
-- Silinme izi `system_logs`'ta kalır — satır gider, olay gitmez.

create or replace function public.delete_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitations;
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select i.* into v_row
    from public.invitations i
   where i.id = p_invitation_id
     and i.inviter_org_id = public.get_my_org_id()
   for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND' using errcode = '42501';
  end if;

  -- Yaşayan davet silinmez; önce iptal edilmeli (kural 16).
  if v_row.used_at is null
     and v_row.revoked_at is null
     and v_row.expires_at > now() then
    raise exception 'INVITATION_ACTIVE' using errcode = '22023';
  end if;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_row.inviter_org_id, 'invitation.deleted',
          'invitations', v_row.id,
          jsonb_build_object('phone', v_row.phone, 'company_name', v_row.company_name));

  delete from public.invitations where id = v_row.id;
end;
$$;

grant execute on function public.delete_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';
