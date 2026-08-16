import type { ReactNode } from 'react';

interface Props {
  label: string;
  /** Okunmamış/sepetteki adet. 0 ve `undefined` rozet çizdirmez. */
  count?: number | undefined;
  className?: string;
  onClick: () => void;
  /** SVG `path` içeriği. */
  children: ReactNode;
}

/**
 * Üst çubuğun ikon düğmesi — bildirim, sepet, mobil menü.
 *
 * Üçü de ayrı ayrı yazılmıştı: biri `p-2 rounded-lg`, diğerleri
 * `p-2 rounded-xl`, sayaç rozetlerinden biri `bg-red-600` diğeri
 * `bg-rose-500` idi. Tek bileşen olunca ölçü ve renk kaymayı bırakıyor.
 */
export function TopBarIconButton({ label, count, className = '', onClick, children }: Props) {
  const showCount = count != null && count > 0;

  return (
    <button
      type="button"
      aria-label={showCount ? `${label} (${count} yeni)` : label}
      title={label}
      onClick={onClick}
      className={`relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg
        text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${className}`}
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
        {children}
      </svg>
      {showCount && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center
            rounded-full bg-red-600 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
