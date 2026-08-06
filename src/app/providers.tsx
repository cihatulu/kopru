import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthListener } from '@/features/auth';

/**
 * Sunucu durumunun TEK kaynağı (KİLİTLİ KURAL 12).
 * staleTime global olarak verilmez — her sorgu kendi değerini `STALE_TIME`
 * sabitlerinden seçer (PLAN §17.2).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      {children}
    </QueryClientProvider>
  );
}

/** Auth olayları TEK noktadan dinlenir; oturum değişince cache tazelenir. */
function AuthListener() {
  useAuthListener();
  return null;
}
