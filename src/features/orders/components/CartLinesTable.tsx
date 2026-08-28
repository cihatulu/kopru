import { formatMoney } from '@/lib/format';
import { lineTotal, type CartLine } from '../domain/cart';

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNjAwIDQwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=';

const TH = 'px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest';
const STEP =
  'size-8 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all text-base font-bold leading-none cursor-pointer shadow-2xs active:scale-95';

interface Props {
  lines: CartLine[];
  onQuantityChange: (line: CartLine, quantity: number) => void;
}

/** Sepet içeriği — Masaüstünde geniş tablo, mobilde E-Ticaret Akıllı Kartları. */
export function CartLinesTable({ lines, onQuantityChange }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
      {/* Kart Başlığı */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-brand-500" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Sepet İçeriği
          </span>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {lines.length} Ürün
        </span>
      </div>

      {/* 📱 MOBİL GÖRÜNÜM: E-Ticaret Sepet Kartları (md altı ekranlar) */}
      <div className="divide-y divide-slate-100 p-3 sm:p-4 md:hidden space-y-3">
        {lines.map((l) => {
          const effectiveUnit = l.unitPrice + (l.priceDifference || 0);
          const key = `${l.productId}_${l.customDescription || ''}_${l.priceDifference || 0}`;

          return (
            <div
              key={key}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80 pt-3"
            >
              {/* Üst Alan: Görsel + Ürün Bilgisi + Sil Butonu */}
              <div className="flex items-start gap-3">
                {/* Ürün Görseli */}
                <div className="size-20 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50 shadow-2xs">
                  <img
                    src={l.imageUrl || PLACEHOLDER}
                    alt={l.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Ürün Bilgisi */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={l.name}>
                      {l.name}
                    </p>

                    {/* Sepetten Çıkar (Çöp Kutusu) */}
                    <button
                      type="button"
                      onClick={() => onQuantityChange(l, 0)}
                      className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                      title="Sepetten çıkar"
                      aria-label="Sepetten çıkar"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Özel Değişiklik Talebi */}
                  {l.customDescription && (
                    <span className="mt-1 inline-block text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md font-semibold border border-brand-100/60">
                      Talep: {l.customDescription}
                    </span>
                  )}

                  {/* Birim Fiyat */}
                  <div className="mt-1 text-xs text-slate-500 font-medium">
                    <span>Birim: {formatMoney(effectiveUnit)}</span>
                    {l.priceDifference != null && l.priceDifference !== 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">
                        (Taban: {formatMoney(l.unitPrice)} {l.priceDifference > 0 ? '+' : ''}
                        {formatMoney(l.priceDifference)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Alt Alan: Miktar Seçici (Stepper) & Satır Toplamı */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                {/* Adet Arttır / Azalt */}
                <div className="flex items-center gap-1.5 bg-slate-50/80 rounded-xl p-1 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(l, l.quantity - 1)}
                    className={STEP}
                    aria-label="Adet Azalt"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold text-slate-900 font-mono">
                    {l.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(l, l.quantity + 1)}
                    className={STEP}
                    aria-label="Adet Artır"
                  >
                    +
                  </button>
                </div>

                {/* Toplam Satır Tutarı */}
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam
                  </span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {formatMoney(lineTotal(l))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-x-auto">
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
                        <img
                          src={l.imageUrl || PLACEHOLDER}
                          alt={l.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm line-clamp-2 leading-tight">
                          {l.name}
                        </p>
                        {l.customDescription && (
                          <span className="mt-1.5 inline-block text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg font-semibold border border-brand-100/50">
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
                      <button
                        type="button"
                        onClick={() => onQuantityChange(l, l.quantity - 1)}
                        className={STEP}
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-bold text-slate-800">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange(l, l.quantity + 1)}
                        className={STEP}
                      >
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
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all ml-auto cursor-pointer"
                      title="Sepetten çıkar"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
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
