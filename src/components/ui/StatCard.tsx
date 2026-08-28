import type { ReactNode } from 'react';

/*
  TEK SAYAÇ KARTI KABUĞU (Impeccable Design System).

  Platform genelindeki tüm sayaç ve özet kartları bu ortak kabuktan beslenir.
  Renk yalnız DURUMU ve ANLAMI (neutral / attention / positive / negative) taşır.
*/
export const STAT_SURFACE =
  'flex min-w-0 flex-col rounded-2xl border bg-white p-4 sm:p-5 text-left shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] hover:shadow-md hover:shadow-slate-200/80 hover:-translate-y-0.5 transition-all duration-200';

/** Seçilebilir olmayan kartların kenarlığı (Daha belirgin ve 3 boyutlu derinlik). */
export const STAT_BORDER = 'border-slate-200/90 hover:border-slate-300 ring-1 ring-slate-900/[0.04]';

interface Props {
  label: string;
  value: string | number;
  /** Rakamın altındaki tek satır açıklama. */
  hint?: ReactNode;
  /** İkon kutusunun zemin + ikon rengi, ör. `bg-amber-50 text-amber-600`. */
  iconClass?: string;
  /** Rakamın rengi. Varsayılan koyu. */
  valueClass?: string;
  /** SVG `path` içeriği; viewBox ve stroke ayarları burada verilir. */
  icon: ReactNode;
}

/**
 * SIFIR DEĞER SÖNÜK ÇİZİLİR.
 *
 * "Bekleyen sipariş: 0" kartını kehribara boyamak yanlış alarm üretir.
 * Sıfır değerler nötr gri renkte sönük çizilir.
 */
const IDLE_ICON = 'bg-slate-100 text-slate-400 border-slate-200/60';
const IDLE_VALUE = 'text-slate-400';

/** "0", "₺0,00", "%0,0" — hiç sıfırdan farklı rakam içermiyorsa sönük. */
const isZero = (v: string | number) => !/[1-9]/.test(String(v));

/**
 * Kartın iç düzeni.
 */
export function StatCardContent({
  label,
  value,
  hint,
  iconClass = 'bg-slate-100 text-slate-500',
  valueClass = 'text-slate-900',
  icon,
}: Props) {
  const idle = isZero(value);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 pt-0.5 text-[11px] font-extrabold uppercase leading-tight tracking-wider text-slate-500">
          {label}
        </span>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/5 shadow-xs transition-transform ${
            idle ? IDLE_ICON : iconClass
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
      </div>

      <span
        className={`mt-2.5 truncate text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
          idle ? IDLE_VALUE : valueClass
        }`}
      >
        {value}
      </span>

      {hint !== undefined && (
        <span className="mt-1.5 truncate text-[11px] font-medium text-slate-400">{hint}</span>
      )}
    </>
  );
}

/** Tıklanmayan sayaç kartı. */
export function StatCard(props: Props) {
  return (
    <div className={`${STAT_SURFACE} ${STAT_BORDER}`}>
      <StatCardContent {...props} />
    </div>
  );
}
