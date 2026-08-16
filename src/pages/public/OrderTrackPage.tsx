import { useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { TrackOrderView, useTrackOrder } from '@/features/orders';

/**
 * Public sipariş takibi — YALNIZ KOMPOZİSYON (A20).
 *
 * Oturum GEREKTİRMEZ: bağlantı müşteriye WhatsApp ile gider ve jetonu bilen
 * görür. Router'da guard'ların dışında durur.
 */
export default function OrderTrackPage() {
  const { token } = useParams<{ token: string }>();
  const query = useTrackOrder(token);

  const message = !token
    ? 'Geçersiz takip bağlantısı.'
    : query.isError
      ? 'Sipariş bilgileri yüklenirken bir hata oluştu.'
      : query.isSuccess && !query.data
        ? 'Sipariş bulunamadı. Bağlantının doğruluğundan emin olun.'
        : null;

  return (
    <main className="min-h-screen bg-slate-50 flex items-start justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight">Sipariş Takip</h1>
          <p className="mt-1 text-xs text-slate-400 font-mono select-all break-all">
            {token ?? '—'}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {query.isPending && token && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-xs text-slate-400 font-medium">Sipariş durumu sorgulanıyor...</p>
            </div>
          )}

          {message && (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 text-xl">
                !
              </div>
              <h2 className="font-bold text-slate-900 text-sm">Sipariş Sorgulanamadı</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{message}</p>
            </div>
          )}

          {query.data && <TrackOrderView order={query.data} />}
        </div>
      </div>
    </main>
  );
}
