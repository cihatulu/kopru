import { formatMoney, formatDateTime, formatDate } from '@/lib/format';
import { ORDER_STATUS_META } from '../domain/status';
import { TrackSteps } from './TrackSteps';
import {
  aggregate,
  getEffectiveStatus,
  isCustomerPayment,
  linesTotal,
  mergedHistory,
  sourcesOf,
  stepIndexOf,
  type AggregatedLine,
  type TrackedItem,
  type TrackedOrder,
  type TrackedShipment,
} from '../domain/tracking';

const CARD = 'rounded-xl border border-slate-200 bg-white p-4';

/** İşaretli tutar: eksi fark indirimdir ve öyle okunmalıdır. */
const signed = (n: number) => `${n > 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

const Lines = ({ title, lines }: { title: string; lines: AggregatedLine[] }) => (
  <div className={CARD}>
    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</h3>
    <ul className="divide-y divide-slate-50">
      {lines.map((l) => (
        <li key={l.key} className="flex items-start justify-between gap-3 py-2.5 text-sm">
          <div>
            <p className="font-semibold text-slate-800">{l.name}</p>
            <p className="text-xs text-slate-400">{l.quantity} adet</p>
            {/* Tutar burada YAZILMAZ; kırılım sağda, ürün fiyatının altında. */}
            {l.customDescription && (
              <p className="mt-1 text-xs leading-snug text-amber-800">
                Talebiniz: {l.customDescription}
              </p>
            )}
          </div>
          {l.unitPrice > 0 && (
            <div className="text-right whitespace-nowrap">
              {/* Ürünün kendi fiyatı sabit kalır; pazarlık altında ayrı okunur. */}
              <p className="font-bold text-slate-900">{formatMoney(l.unitPrice * l.quantity)}</p>
              {l.priceDifference !== 0 && (
                <>
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      l.priceDifference > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {signed(l.priceDifference * l.quantity)}
                  </p>
                  <p className="mt-1 border-t border-slate-200 pt-1 font-bold text-slate-900">
                    {formatMoney((l.unitPrice + l.priceDifference) * l.quantity)}
                  </p>
                </>
              )}
            </div>
          )}
        </li>
      ))}
      {lines.length === 0 && <li className="py-3 text-xs italic text-slate-400">Kayıt yok.</li>}
    </ul>
  </div>
);

/** Müşteriye açık sipariş takibi. Fiyatlar perakende (KATMAN 3). */
export function TrackOrderView({ order }: { order: TrackedOrder }) {
  const sources = sourcesOf(order);
  const original = aggregate(sources, 'original');
  const remaining = aggregate(sources, 'remaining');
  const effectiveStatus = getEffectiveStatus(order);
  const activeIndex = stepIndexOf(effectiveStatus);
  const history = mergedHistory(order);

  const originalTotal = linesTotal(original);
  // İptal edilen sevkiyatları finansal hesaptan düş
  const activeSources = sources.filter((s) => s.status !== 'cancelled');
  const activeOriginal = aggregate(activeSources, 'original');
  const effectiveTotal = linesTotal(activeOriginal);
  const paid = Math.round(
    order.payments
      .filter(isCustomerPayment)
      .reduce((sum, p) => sum + Number(p.amount), 0) * 100,
  ) / 100;
  const balance = Math.round((effectiveTotal - paid) * 100) / 100;
  const changed = remaining.length !== original.length ||
    remaining.some((r, i) => r.quantity !== original[i]?.quantity);

  const childShipments = order.shipments ?? [];
  const allShipments: TrackedShipment[] = [...childShipments];

  // Ana sipariş sevk edildiyse veya teslim edildiyse, ana siparişte kalan ürünler de sevk edilmiştir.
  // Ana sipariş iptal edildiyse de (kısmi sevk sonrası kalan kalem iptal edildiğinde),
  const parentStatuses = ['shipped', 'delivered', 'cancelled', 'returned'] as const;
  if (parentStatuses.includes(order.status as typeof parentStatuses[number])) {
    // Çocuklara taşınmayan (kalan veya iptal edilen) ürünleri miktar bazında hesapla
    const parentItemsToShow: TrackedItem[] = original
      .map((r): TrackedItem | null => {
        const prodId = r.key.split('|')[0] || null;
        // Bu ürünün aktif (iptal edilmemiş) çocuk sevkiyatlarda sevk edilen toplam adedini bul
        const childShippedQty = childShipments.reduce((sum, s) => {
          if (s.status === 'cancelled') return sum;
          const match = s.items.find(
            (item) => (prodId && item.productId === prodId) || item.name === r.name
          );
          return sum + (match?.quantity ?? 0);
        }, 0);

        const diffQty = r.quantity - childShippedQty;
        if (diffQty <= 0) return null;

        return {
          productId: prodId,
          name: r.name,
          quantity: diffQty,
          unit_price: r.unitPrice,
          total_price: r.unitPrice * diffQty,
          custom_description: r.customDescription,
        };
      })
      .filter((item): item is TrackedItem => item !== null);

    const isCancelledOrReturned = order.status === 'cancelled' || order.status === 'returned';

    // İptal/iade durumunda kart her zaman gösterilir (kalem olmasa bile iptal kaydı temsil edilmeli).
    // Sevk/teslim durumunda sadece kalan kalem varsa kart gösterilir.
    if (isCancelledOrReturned || parentItemsToShow.length > 0) {
      allShipments.push({
        id: 'parent-shipment',
        order_no: order.order_no,
        status: order.status,
        note: order.note,
        created_at: order.updated_at || order.created_at,
        items: parentItemsToShow,
        returned_items: [],
        history: order.history.filter((h) =>
          h.status === 'shipped' ||
          h.status === 'delivered' ||
          h.status === 'cancelled' ||
          h.status === 'returned'
        ),
      });
    }
  }

  // Tarihe göre sıralayalım (en yeni en üstte dursun)
  allShipments.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      {activeIndex === -1 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-bold text-red-800">
            {order.status === 'returned' ? 'Sipariş İade Edildi' : 'Sipariş İptal Edildi'}
          </p>
          <p className="mt-1 text-xs text-red-600">
            Bu sipariş için aktif bir işlem bulunmamaktadır.
          </p>
        </div>
      ) : (
        <TrackSteps activeIndex={activeIndex} />
      )}

      {/* Nihai Müşteriye Teslimat & Montaj Randevusu Kartı */}
      {order.customer_deliveries && order.customer_deliveries.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-base">
                🚚
              </span>
              <div>
                <h3 className="text-sm font-black text-emerald-950">
                  Adresinize Teslimat & Montaj Planlandı
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Mağazanız tarafından randevunuz oluşturulmuştur.
                </span>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
              Randevu Aktif
            </span>
          </div>

          {order.customer_deliveries.map((deliv, idx) => (
            <div key={deliv.id || idx} className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white/80 rounded-xl p-3 border border-emerald-100/80">
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

              {deliv.customer_address && (
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100/80">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Teslimat Adresi
                  </span>
                  <span className="font-medium text-slate-800 leading-relaxed block mt-0.5">
                    📍 {deliv.customer_address}
                  </span>
                </div>
              )}

              {deliv.notes && (
                <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100 text-emerald-900 font-medium">
                  <span className="font-bold text-emerald-950">📝 Not:</span> {deliv.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sipariş Temel Bilgileri */}
      <div className={CARD}>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-slate-500">Sipariş No</span>
          <span className="font-mono font-bold text-slate-900">{order.order_no}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm mt-2">
          <span className="text-slate-500">Sipariş Tarihi</span>
          <span className="text-slate-700">{formatDateTime(order.created_at)}</span>
        </div>
        {order.customer_name && (
          <div className="flex flex-wrap justify-between gap-2 text-sm mt-2">
            <span className="text-slate-500">Müşteri</span>
            <span className="text-slate-700">{order.customer_name}</span>
          </div>
        )}
      </div>

      {/* Sipariş Özeti ve Fiyat Kırılımı */}
      <div className="space-y-4">
        {changed && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            <span className="font-bold">Bilgi:</span> Sipariş içeriğinde değişiklik yapılmıştır.
            Aşağıda güncel durum ve teslim edilen ürünler gösterilmektedir.
          </div>
        )}

        <Lines title="Sipariş Edilen Ürünler (İlk Hâl)" lines={original} />

        {changed && <Lines title="Kalan / Güncel Ürünler" lines={remaining} />}
      </div>

      {originalTotal > 0 && (
        <div className={CARD}>
          {effectiveTotal !== originalTotal && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Sipariş Tutarı</span>
              <span className="font-semibold text-slate-400 line-through">{formatMoney(originalTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{effectiveTotal !== originalTotal ? 'İptal Sonrası Tutar' : 'Sipariş Tutarı'}</span>
            <span className="font-semibold text-slate-800">{formatMoney(effectiveTotal)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-500">Ödenen</span>
            <span className="font-semibold text-emerald-600">{formatMoney(paid)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2 border-t border-slate-100 pt-2">
            <span className="font-bold text-slate-800">Kalan Bakiye</span>
            <span className="font-bold text-slate-900">{formatMoney(balance)}</span>
          </div>
        </div>
      )}

      {order.note && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Sipariş Notu
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{order.note}</p>
        </div>
      )}

      {/* Sevkiyatlar ve İptaller Bölümü */}
      {allShipments.length > 0 && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Sevkiyat ve İptal Detayları
          </h3>
          <div className="space-y-4">
            {allShipments.map((s) => {
              const isCancelled = s.status === 'cancelled';
              const isParent = s.id === 'parent-shipment';
              const cardTitle = isParent
                ? isCancelled
                  ? `İptal Edilen Sevkiyat (Sevk No: ${s.order_no})`
                  : `Kalan Sevkiyat (Sevk No: ${s.order_no})`
                : `Sevkiyat (Sevk No: ${s.order_no})`;

              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isCancelled 
                      ? 'border-red-200 bg-red-50/20' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <span className={`text-xs font-bold ${isCancelled ? 'text-red-900 font-extrabold' : 'text-slate-800'}`}>
                        {cardTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {formatDateTime(s.created_at)}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                        isCancelled 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : s.status === 'delivered' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {ORDER_STATUS_META[s.status]?.label ?? s.status}
                    </span>
                  </div>

                  {isCancelled ? (
                    <div className="mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-red-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-2 text-left">Durum</th>
                            <th className="pb-2 pl-2 text-left">Ürün</th>
                            <th className="pb-2 text-center">Adet</th>
                            <th className="pb-2 text-right">Birim Fiyat</th>
                            <th className="pb-2 text-right">İptal Tutarı</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.items.map((item, idx) => (
                            <tr key={`${item.productId ?? item.name}-${idx}`} className="border-b border-slate-50">
                              <td className="py-2 pr-2">
                                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                                  ✕ İptal
                                </span>
                              </td>
                              <td className="py-2 pl-2 font-semibold text-slate-700">{item.name}</td>
                              <td className="py-2 text-center text-slate-600 font-bold">{item.quantity} Adet</td>
                              <td className="py-2 text-right text-slate-500">
                                {item.unit_price > 0 ? formatMoney(item.unit_price) : '—'}
                              </td>
                              <td className="py-2 text-right font-semibold text-red-500 line-through">
                                {item.unit_price > 0 ? formatMoney(item.unit_price * item.quantity) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2.5 flex items-center justify-between border-t border-red-100 pt-2 text-xs">
                        <span className="font-bold text-slate-600">
                          İptal Edilen Toplam Tutar:{' '}
                          <span className="font-mono text-red-600 font-bold">
                            {formatMoney(s.items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0))}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Tahsil Edilmez (₺0,00)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <ul className="divide-y divide-slate-50">
                        {s.items.map((item, idx) => {
                          const retItem = s.returned_items?.find(
                            (r) => (r.productId && r.productId === item.productId) || (r.name && r.name === item.name)
                          );
                          const retQty = retItem?.quantity ?? 0;
                          const deliveredQty = Math.max(0, item.quantity - retQty);

                          return (
                            <li key={`${item.productId ?? item.name}-${idx}`} className="py-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                <span className="font-bold text-slate-900">{item.quantity} adet sevk</span>
                              </div>
                              {retQty > 0 && (
                                <div className="mt-1.5 flex items-center justify-between bg-amber-50/80 border border-amber-200/70 rounded-lg px-2.5 py-1.5 text-[11px]">
                                  <span className="font-bold text-amber-900 flex items-center gap-1">
                                    <span>↩</span> {retQty} Adet İade Edildi
                                  </span>
                                  <span className="font-semibold text-slate-600">
                                    Kalan Teslim: <strong className="text-emerald-700">{deliveredQty} adet</strong>
                                  </span>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* İade Edilen Ürün Dökümü */}
                      {s.returned_items && s.returned_items.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
                          <span className="font-bold text-amber-900 uppercase tracking-wider text-[9px] block mb-2">
                            İade Edilen Ürün ve Fiyat Detayı
                          </span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-amber-200/60 text-[10px] font-bold uppercase text-amber-800/80">
                                  <th className="pb-1.5 text-left">Ürün</th>
                                  <th className="pb-1.5 text-center">İade Adedi</th>
                                  <th className="pb-1.5 text-right">Birim Fiyat</th>
                                  <th className="pb-1.5 text-right">İade Tutarı</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100">
                                {s.returned_items.map((r, rIdx) => {
                                  const rName = r.name || s.items.find((i) => i.productId === r.productId)?.name || 'Ürün';
                                  const rUnitPrice = r.unit_price ?? (s.items.find((i) => i.productId === r.productId)?.unit_price ?? 0);
                                  const rTotal = r.total_price ?? (rUnitPrice * r.quantity);

                                  return (
                                    <tr key={rIdx} className="text-[11px]">
                                      <td className="py-1.5 font-semibold text-slate-800 pr-2">{rName}</td>
                                      <td className="py-1.5 text-center font-bold text-amber-900 whitespace-nowrap">{r.quantity} Adet</td>
                                      <td className="py-1.5 text-right text-slate-600 whitespace-nowrap">
                                        {rUnitPrice > 0 ? formatMoney(rUnitPrice) : '—'}
                                      </td>
                                      <td className="py-1.5 text-right font-bold text-amber-950 whitespace-nowrap">
                                        {rTotal > 0 ? formatMoney(rTotal) : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {s.history && s.history.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-2.5">Geçmiş ve İşlem Notları</span>
                      <div className="relative pl-4 border-l border-slate-100 ml-1 space-y-3">
                        {s.history.map((h, idx) => {
                          const isReturn = h.status === 'returned' || h.note?.includes('İade');
                          const isCancel = h.status === 'cancelled';
                          const statusLabel = isReturn
                            ? (h.note?.includes('Kısmi') ? 'Kısmi İade' : 'İade Edildi')
                            : isCancel
                              ? 'İptal Edildi'
                              : (ORDER_STATUS_META[h.status]?.label ?? h.status);

                          return (
                            <div key={idx} className="relative text-xs">
                              <span className={`absolute -left-[21px] top-1.5 size-1.5 rounded-full ${isReturn || isCancel ? 'bg-red-500' : 'bg-slate-350'}`} />
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold ${isReturn || isCancel ? 'text-red-700' : 'text-slate-700'}`}>
                                  {statusLabel}
                                </span>
                                <span className="font-mono text-slate-400 text-[10px]">{formatDateTime(h.created_at)}</span>
                              </div>
                              {h.note && (
                                <p className="mt-1 text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed whitespace-pre-line font-medium text-[11px] break-words break-all [overflow-wrap:anywhere]">
                                  {h.note}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {s.note && (!s.history || s.history.length === 0) && (
                    <div className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block mb-0.5">Açıklama / Sevk Kodu</span>
                      <p className="text-slate-650 leading-relaxed font-medium whitespace-pre-line break-words break-all [overflow-wrap:anywhere]">{s.note}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Sipariş Geçmişi
          </h3>
          <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
            {history.map((h, i) => {
              const isReturnLog = h.status === 'returned' || h.note?.includes('İade');
              const isCancelLog = h.status === 'cancelled';
              const meta = ORDER_STATUS_META[h.status];
              const dotColor = isReturnLog || isCancelLog
                ? 'bg-red-500 ring-red-100'
                : h.status === 'delivered'
                  ? 'bg-emerald-500 ring-emerald-100'
                  : h.status === 'shipped' || h.status === 'partially_shipped'
                    ? 'bg-purple-500 ring-purple-100'
                    : 'bg-blue-500 ring-blue-100';

              const displayLabel = isReturnLog
                ? (h.note?.includes('Kısmi') ? 'Kısmi İade' : 'İade Edildi')
                : (meta?.label ?? h.status);

              return (
                <div key={`${h.created_at}-${i}`} className="relative min-w-0">
                  <span className={`absolute -left-[31px] top-1.5 size-2.5 rounded-full ${dotColor} ring-4`} />
                  
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {formatDateTime(h.created_at)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isReturnLog || isCancelLog ? 'text-red-700' : 'text-slate-800'}`}>
                        {displayLabel}
                      </span>
                      {h.order_no && (
                        <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 leading-tight">
                          {h.order_no}
                        </span>
                      )}
                    </div>
                    {h.note && (
                      <p className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed whitespace-pre-line font-medium break-words break-all [overflow-wrap:anywhere]">
                        {h.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
