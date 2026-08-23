import type { ReactNode } from 'react';

/*
  TEK TABLO DİLİ (Impeccable Design Standard).
*/

/** Başlık hücresi — sola dayalı varsayılan. */
export const TH =
  'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';

/** Sayı sütunu başlığı: rakam sağa dayanır ki basamaklar hizalansın. */
export const TH_NUM = `${TH} text-right`;
export const TH_CENTER = `${TH} text-center`;

/** Gövde hücresi. */
export const TD = 'px-4 py-3.5 text-sm text-slate-700 align-middle';
export const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;
export const TD_CENTER = `${TD} text-center whitespace-nowrap`;

/** Birincil tanımlayıcı sütun (ürün adı, firma adı) — koyu ve kalın. */
export const TD_STRONG = `${TD} font-bold text-slate-900`;

/** Kod/VKN/sipariş no gibi eşleştirme alanları monospace okunur. */
export const TD_CODE = `${TD} font-mono text-xs text-slate-500 whitespace-nowrap`;

/** Başlık şeridi zemini — tablo kaydırılırken sütun adı kaybolmaz. */
export const THEAD = 'border-b border-slate-200/80 bg-slate-50/80';

/** Satır ayracı + hover. Satır tıklanabilirse `cursor-pointer` ekle. */
export const TBODY = 'divide-y divide-slate-100 font-medium text-slate-700';
export const TR = 'transition-colors hover:bg-slate-50/60';

/** Kart içinde kenardan kenara akan tablo için yatay kaydırma kabı. */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

interface EmptyProps {
  /** Tablodaki sütun sayısı — satır tabloyu tam kaplasın diye gerekli. */
  colSpan: number;
  children: ReactNode;
}

/**
 * "Kayıt yok" satırı (Modern Impeccable Empty State).
 */
export function TableEmpty({ colSpan, children }: EmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-400 mb-2.5 border border-slate-200/60 shadow-2xs">
          <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-400">{children}</p>
      </td>
    </tr>
  );
}
