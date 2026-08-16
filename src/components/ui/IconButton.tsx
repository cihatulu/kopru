import type { ReactNode } from 'react';

type Size = 'sm' | 'md';

/** `Button`'ın `sm`/`md` boyutlarıyla aynı kare ölçüler. */
const SIZES: Record<Size, string> = {
  sm: 'size-8',
  md: 'size-9',
};

const ICON: Record<Size, string> = {
  sm: 'size-4',
  md: 'size-5',
};

interface Props {
  label: string;
  size?: Size;
  /** Yıkıcı eylem — kırmızı hover. Kalıcı silmede kullanılır. */
  danger?: boolean;
  disabled?: boolean;
  /** Okunmamış/sepetteki adet. 0 ve `undefined` rozet çizdirmez. */
  count?: number | undefined;
  className?: string;
  onClick: () => void;
  /** SVG `path` içeriği; viewBox ve stroke ayarları burada verilir. */
  children: ReactNode;
}

/**
 * İkon eylem düğmesi — tablo satırı, üst çubuk, araç çubuğu.
 *
 * Üç ayrı yerde ayrı ayrı yazılmıştı: biri `p-1.5`, biri `p-2 rounded-lg`,
 * diğerleri `p-2 rounded-xl`; sayaç rozetlerinden biri `bg-red-600`,
 * diğeri `bg-rose-500` idi. Ölçüsü `Button`'ın kare karşılığıdır, böylece
 * aynı satırda metin düğmesiyle yan yana geldiğinde hizası bozulmaz.
 *
 * Hover rengi marka tokenından gelir — org kendi rengini verdiğinde ikon
 * düğmeleri de döner (eskiden sabit `indigo-600` idi ve dönmüyordu).
 */
export function IconButton({
  label,
  size = 'sm',
  danger,
  disabled,
  count,
  className = '',
  onClick,
  children,
}: Props) {
  const showCount = count != null && count > 0;

  return (
    <button
      type="button"
      title={label}
      aria-label={showCount ? `${label} (${count} yeni)` : label}
      onClick={onClick}
      disabled={disabled ?? false}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-lg
        text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40
        ${SIZES[size]} ${
          danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-brand-600'
        } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={ICON[size]}
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
