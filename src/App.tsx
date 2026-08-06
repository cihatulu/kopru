// KİLİTLİ KURAL 10 — App.tsx YALNIZCA router.
// İş mantığı, state, veri çekme buraya yazılmaz (guard-write hook'u bloklar).
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
