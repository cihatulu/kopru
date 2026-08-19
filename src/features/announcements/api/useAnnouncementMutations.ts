import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['announcements'] });
}

// `| undefined`: form alanı boşken undefined gönderir; burada null'a çevrilir.
export interface PublishAnnouncementInput {
  ownerOrgId: string;
  title: string;
  body: string;
  targetRetailerOrgId?: string | null | undefined;
  imageUrl?: string | null | undefined;
}

export function usePublishAnnouncement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: PublishAnnouncementInput) => {
      const { error } = await supabase.from('announcements').insert({
        owner_org_id: input.ownerOrgId,
        title: input.title,
        body: input.body,
        target_retailer_org_id: input.targetRetailerOrgId || null,
        image_url: input.imageUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export interface UpdateAnnouncementInput {
  id: string;
  title: string;
  body: string;
  targetRetailerOrgId?: string | null | undefined;
  imageUrl?: string | null | undefined;
}

export function useUpdateAnnouncement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdateAnnouncementInput) => {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: input.title,
          body: input.body,
          target_retailer_org_id: input.targetRetailerOrgId || null,
          image_url: input.imageUrl || null,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetAnnouncementActive() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // Soft delete (kilitli kural 16).
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Perakendeci kendi listesinden duyuruyu gizler.
 * announcements satırına dokunulmaz (üreticinin kaydı korunur);
 * announcement_reads tablosuna dismissed=true upsert edilir.
 * RLS: announcement_reads_own politikası (retailer_org_id = get_my_org_id()) yeterli.
 */
export function useDeleteAnnouncement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, retailerOrgId }: { id: string; retailerOrgId: string }) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { announcement_id: id, retailer_org_id: retailerOrgId, dismissed: true },
          { onConflict: 'announcement_id,retailer_org_id' },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Okundu işareti — yalnız okuyan perakendeci yazabilir (RLS). */
export function useMarkRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, retailerOrgId }: { id: string; retailerOrgId: string }) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { announcement_id: id, retailer_org_id: retailerOrgId },
          { onConflict: 'announcement_id,retailer_org_id' },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
