import { formatMoney } from '@/lib/format';
import type { AggregatedLine, TrackedShipment } from '../domain/tracking';
import { shipmentLines } from '../domain/trackingTotals';

/** Teslim edilen sevkiyatın kalemleri; iade varsa net adet ve tutar. */
export function TrackDeliveredTable({ s, original }: { s: TrackedShipment; original: AggregatedLine[] }) {
  const {
    lines: shipmentCalculations,
    initialTotal: initialShipmentTotal,
    netDeliveredTotal: netShipmentDeliveredTotal,
    returnTotal: shipmentReturnTotal,
  } = shipmentLines(s, original);
  const hasReturns = shipmentReturnTotal > 0;
  return (
    <div className="mt-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <th className="pb-2 text-left">Ürün</th>
            <th className="pb-2 text-center">Teslim Adedi</th>
            <th className="pb-2 text-right">Birim Fiyat</th>
            <th className="pb-2 text-right">Teslim Tutarı</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {shipmentCalculations.map((calc, idx) => {
            const { item, retQty, deliveredQty, unitP, initialTotalP, netDeliveredTotalP } = calc;

            return (
              <tr key={`${item.productId ?? item.name}-${idx}`}>
                <td className="py-2.5 pr-2">
                  <span className="font-semibold text-slate-800 block">{item.name}</span>
                  {item.custom_description && (
                    <span className="text-[10px] text-amber-800 block mt-0.5">
                      Özel Talep: {item.custom_description}
                    </span>
                  )}
                  {retQty > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200/60">
                      ↩ {retQty} Adet İade Edildi ({item.quantity} Sevkten Kalan)
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-center whitespace-nowrap">
                  {retQty > 0 ? (
                    <div>
                      <span className="font-bold text-slate-900">{deliveredQty} Adet</span>
                      <span className="text-[10px] text-slate-400 block line-through">({item.quantity} Sevk)</span>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-900">{item.quantity} Adet</span>
                  )}
                </td>
                <td className="py-2.5 text-right text-slate-600 whitespace-nowrap">
                  {unitP > 0 ? formatMoney(unitP) : '—'}
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  {retQty > 0 ? (
                    <div>
                      <span className="font-bold text-slate-900">{formatMoney(netDeliveredTotalP)}</span>
                      <span className="text-[10px] text-slate-400 block line-through">{formatMoney(initialTotalP)}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-900">{formatMoney(netDeliveredTotalP)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2.5 flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 text-xs gap-2">
        {hasReturns ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">İlk Sevk: <span className="line-through">{formatMoney(initialShipmentTotal)}</span></span>
              <span className="text-amber-800 text-[11px] font-semibold">İade: −{formatMoney(shipmentReturnTotal)}</span>
            </div>
            <span className="font-bold text-slate-800 text-xs">
              Teslim Edilen Net Tutar:{' '}
              <span className="font-mono text-emerald-700 font-bold text-sm">
                {formatMoney(netShipmentDeliveredTotal)}
              </span>
            </span>
          </div>
        ) : (
          <span className="font-bold text-slate-600">
            Teslim Edilen Toplam Tutar:{' '}
            <span className="font-mono text-slate-900 font-bold">
              {formatMoney(netShipmentDeliveredTotal)}
            </span>
          </span>
        )}

        <span className="text-[11px] font-semibold text-emerald-700">
          {s.status === 'delivered' ? '✓ Teslim Edildi' : 'Yolda / Sevk Edildi'}
        </span>
      </div>
    </div>
  );
}
