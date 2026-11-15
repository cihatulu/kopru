import { formatMoney } from '@/lib/format';
import type { AggregatedLine } from '../domain/tracking';

export const TRACK_CARD = 'rounded-xl border border-slate-200 bg-white p-4';
const CARD = TRACK_CARD;

/** İşaretli tutar: eksi fark indirimdir ve öyle okunmalıdır. */
const signed = (n: number) => `${n > 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

export const TrackLines = ({ title, lines }: { title: string; lines: AggregatedLine[] }) => (
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
