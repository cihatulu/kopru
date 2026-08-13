import { formatMoney } from '@/lib/format';
import { lineTotal, type CartLine } from '../domain/cart';

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNjAwIDQwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=';

const TH = 'px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest';
const STEP =
  'w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-all text-base font-medium leading-none';

interface Props {
  lines: CartLine[];
  onQuantityChange: (line: CartLine, quantity: number) => void;
}

/** Sepet içeriği. Satır kimliği ürün + değişiklik notu + fiyat farkı üçlüsüdür. */
export function CartLinesTable({ lines, onQuantityChange }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Sepet İçeriği
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[500px] w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-slate-100">
              <th className={`${TH} text-left`}>Ürün</th>
              <th className={`${TH} text-left`}>Birim Fiyat</th>
              <th className={`${TH} text-center`}>Adet</th>
              <th className={`${TH} text-right`}>Toplam</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {lines.map((l) => {
              const effectiveUnit = l.unitPrice + (l.priceDifference || 0);
              const key = `${l.productId}_${l.customDescription || ''}_${l.priceDifference || 0}`;

              return (
                <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                        <img src={l.imageUrl || PLACEHOLDER} alt={l.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm line-clamp-2 leading-tight">
                          {l.name}
                        </p>
                        {l.model && l.model !== l.code && (
                          <p className="text-xs text-slate-400 mt-0.5">{l.model}</p>
                        )}
                        <p className="text-xs text-slate-400 font-mono">{l.code}</p>
                        {l.customDescription && (
                          <span className="mt-1.5 inline-block text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-semibold border border-indigo-100/50">
                            Değişiklik: {l.customDescription}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                    <div>{formatMoney(effectiveUnit)}</div>
                    {l.priceDifference != null && l.priceDifference !== 0 && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        Taban: {formatMoney(l.unitPrice)}&nbsp;
                        {l.priceDifference > 0 ? '+' : ''}
                        {formatMoney(l.priceDifference)}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => onQuantityChange(l, l.quantity - 1)} className={STEP}>
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-bold text-slate-800">{l.quantity}</span>
                      <button type="button" onClick={() => onQuantityChange(l, l.quantity + 1)} className={STEP}>
                        +
                      </button>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right text-sm font-bold text-slate-800 whitespace-nowrap">
                    {formatMoney(lineTotal(l))}
                  </td>

                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(l, 0)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all ml-auto"
                      title="Sepetten çıkar"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
