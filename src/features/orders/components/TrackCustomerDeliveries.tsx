import { formatDate } from '@/lib/format';
import type { TrackedOrder } from '../domain/tracking';

/** 2. FAZ: nihai müşteri ev teslimatı ve montaj takibi. */
export function TrackCustomerDeliveries({ order }: { order: TrackedOrder }) {
  if (!order.customer_deliveries || order.customer_deliveries.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t-2 border-dashed border-emerald-300/80">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
            2
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Müşteri Adresine Teslimat & Montaj Takibi
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1 pl-9">
          Fabrika tedarik ve sevkiyat süreci tamamlanmış olup; mağazanız tarafından adresinize yapılacak teslimat ve montaj süreci aşağıda yer almaktadır.
        </p>
      </div>

      <div className="space-y-4">
        {order.customer_deliveries.map((deliv, idx) => (
          <div
            key={deliv.id || idx}
            className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-lg shadow-xs">
                  🚚
                </span>
                <div>
                  <h3 className="text-sm font-black text-emerald-950">
                    {deliv.status === 'delivered'
                      ? 'Evinize Teslim Edildi & Montaj Tamamlandı'
                      : deliv.status === 'shipped'
                        ? 'Adresinize Teslimat İçin Yola Çıktı'
                        : 'Adresinize Teslimat & Montaj Planlandı'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                      Sipariş No: <span className="font-mono text-emerald-950">{deliv.order_no || order.order_no}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Plan No: #{deliv.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                {deliv.status === 'delivered' ? '✓ Teslim Edildi' : 'Randevu Aktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 rounded-xl p-3.5 border border-emerald-100/80">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Planlanan Teslimat Tarihi
                </span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <span>📅</span> {formatDate(deliv.delivery_date)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tahmini Saat Aralığı
                </span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <span>⏰</span> {deliv.time_slot}
                </span>
              </div>
            </div>

            {deliv.items && deliv.items.length > 0 && (
              <div className="bg-white/90 rounded-xl p-3.5 border border-emerald-100/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Bu Randevuda Teslim Edilecek Ürünler
                </span>
                <ul className="divide-y divide-emerald-50 text-xs">
                  {deliv.items.map((di, dIdx) => (
                    <li key={dIdx} className="py-1.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{di.name}</span>
                      <span className="font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {di.quantity} Adet
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {deliv.customer_address && (
              <div className="bg-white/90 rounded-xl p-3.5 border border-emerald-100/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Teslimat & Montaj Adresi
                </span>
                <span className="font-medium text-slate-800 leading-relaxed block mt-0.5 text-xs">
                  📍 {deliv.customer_address}
                </span>
              </div>
            )}

            {deliv.notes && (
              <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100 text-xs text-emerald-900 font-medium">
                <span className="font-bold text-emerald-950">📝 Not:</span> {deliv.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
