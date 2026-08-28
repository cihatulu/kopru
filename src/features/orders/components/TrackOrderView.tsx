import { formatMoney, formatDateTime } from '@/lib/format';
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
  // iptale dair bir kart gösterilmelidir.
  const parentStatuses = ['shipped', 'delivered', 'cancelled', 'returned'] as const;
  if (parentStatuses.includes(order.status as typeof parentStatuses[number])) {
    // Çocuklara taşınmayan (ya da iptal edilen) ürünleri hesapla
    const parentItemsToShow = order.status === 'cancelled' || order.status === 'returned'
      // İptal/iade: kök siparişin kendi item listesinden çocuklarda geçen ürünleri çıkar
      ? order.items.filter(item => {
          const inChild = childShipments.some(s =>
            s.status !== 'cancelled' &&
            s.items.some(ci => ci.productId === item.productId || ci.name === item.name)
          );
          return !inChild;
        })
      // Sevk/teslim: remaining'den çocuklarda olmayan kalanları bul
      : remaining.filter(r => {
          const childShippedQty = childShipments.reduce((sum, s) => {
            if (s.status === 'cancelled') return sum;
            const match = s.items.find(item =>
              item.productId === r.key.split('|')[0] || item.name === r.name
            );
            return sum + (match?.quantity ?? 0);
          }, 0);
          return r.quantity - childShippedQty > 0;
        }).map(r => {
          const childShippedQty = childShipments.reduce((sum, s) => {
            if (s.status === 'cancelled') return sum;
            const match = s.items.find(item =>
              item.productId === r.key.split('|')[0] || item.name === r.name
            );
            return sum + (match?.quantity ?? 0);
          }, 0);
          return {
            productId: r.key.split('|')[0] || null,
            name: r.name,
            quantity: r.quantity - childShippedQty,
            unit_price: r.unitPrice,
            total_price: r.unitPrice * (r.quantity - childShippedQty),
            custom_description: r.customDescription,
          };
        });

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
        history: order.history.filter(h =>
          h.status === 'shipped' || h.status === 'delivered' ||
          h.status === 'cancelled' || h.status === 'returned'
        ),
      });
    }
  }

  // Tarihe göre sıralayalım (en yeni en üstte dursun)
  allShipments.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      {activeIndex === -1 ? (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-center">
          <p className="font-bold text-red-900 text-sm">
            {ORDER_STATUS_META[effectiveStatus].label}
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Bu sipariş {effectiveStatus === 'cancelled' ? 'iptal edilmiştir' : 'iade edilmiştir'}.
          </p>
        </div>
      ) : (
        <TrackSteps activeIndex={activeIndex} />
      )}

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

      <Lines title="Sipariş Edilen Ürünler" lines={original} />

      {/* Kalan liste yalnız iade/iptal sonrası ORİJİNALDEN farklıysa anlamlı. */}
      {changed && <Lines title="Güncel Durum (İade / İptal Sonrası)" lines={remaining} />}

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

      {allShipments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
            Sevkiyat ve İptal Detayları
          </h3>
          <div className="space-y-3">
            {allShipments.map((s) => {
              const isCancelled = s.status === 'cancelled';
              return (
                <div 
                  key={s.id} 
                  className={`rounded-xl border p-4 bg-white shadow-sm transition-all ${
                    isCancelled ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
                    <div>
                      <h4 className={`text-xs font-bold ${isCancelled ? 'text-red-700' : 'text-slate-800'}`}>
                        {isCancelled 
                          ? `İptal Edilen Sevkiyat (Sevk No: ${s.order_no})` 
                          : `Sevkiyat (Sevk No: ${s.order_no})`}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatDateTime(s.created_at)}
                      </p>
                    </div>
                    <span 
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
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
                            <th className="pb-2 text-right">Toplam</th>
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
                              <td className="py-2 text-center text-slate-600">{item.quantity} Adet</td>
                              <td className="py-2 text-right text-slate-500">
                                {item.unit_price > 0 ? formatMoney(item.unit_price) : '—'}
                              </td>
                              <td className="py-2 text-right font-semibold text-red-400 line-through">
                                {item.unit_price > 0 ? formatMoney(item.unit_price * item.quantity) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 flex justify-between border-t border-red-100 pt-2">
                        <span className="text-xs font-bold text-slate-700">Toplam Tutar:</span>
                        <span className="text-sm font-extrabold text-red-600">{formatMoney(0)}</span>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {s.items.map((item, idx) => (
                        <li key={`${item.productId ?? item.name}-${idx}`} className="flex justify-between text-xs py-1.5">
                          <span className="font-semibold text-slate-700">{item.name}</span>
                          <span className="font-bold text-slate-800">{item.quantity} adet</span>
                        </li>
                      ))}
                    </ul>
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
