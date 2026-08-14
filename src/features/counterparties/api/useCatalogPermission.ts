import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';

/**
 * Perakendecinin üreticinin kataloğunu düzenleme izni.
 *
 * `relationships.can_edit_catalog` bayrağını çevirir. İzin ilişki bazlıdır:
 * aynı perakendeci bir üreticide yetkili, diğerinde yetkisiz olabilir.
 *
 * RPC ÜZERİNDEN GİDER. Eskiden tabloya doğrudan yazılıyordu; `relationships`
 * üzerinde UPDATE politikası olmadığı için RLS 0 satır günceller ve HATA
 * DÖNDÜRMEZ — anahtar hiç kapanmıyor, kullanıcı da sebebini göremiyordu.
 * Yetki kararı (owner + perakendeci tarafı + misafir üretici) sunucudadır.
 */
export function useToggleCatalogPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relationshipId,
      nextVal,
    }: {
      relationshipId: string;
      nextVal: boolean;
    }) => {
      const { error } = await supabase.rpc('set_catalog_permission', rpcArgs({
        p_relationship_id: relationshipId,
        p_can_edit: nextVal,
      }));
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
    },
  });
}
