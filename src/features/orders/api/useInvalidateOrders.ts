import { useQueryClient } from '@tanstack/react-query';

/** Sipariş mutation'ları sonrası etkilenen önbellekleri tazeler. */
export function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };
}
