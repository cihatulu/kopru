import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Perakendecinin üreticinin kataloğunu düzenleme izni.
 *
 * `relationships.can_edit_catalog` bayrağını çevirir. İzin ilişki bazlıdır:
 * aynı perakendeci bir üreticide yetkili, diğerinde yetkisiz olabilir.
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
      const { error } = await supabase
        .from('relationships')
        .update({ can_edit_catalog: nextVal })
        .eq('id', relationshipId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
    },
  });
}
