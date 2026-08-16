interface Props {
  label: string;
  /** Yıkıcı eylem — kırmızı hover. Kalıcı silmede kullanılır. */
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** SVG `path` içeriği; viewBox ve stroke ayarları burada verilir. */
  children: React.ReactNode;
}

/**
 * Tablo satırlarındaki ikon eylem düğmesi.
 *
 * Ölçüsü `Button`'ın `sm` boyutuyla (32px kare) BİLEREK aynıdır: aynı
 * satırda ikon düğmesiyle metin düğmesi yan yana geldiğinde ikisi aynı
 * yükseklikte durur. Eskiden `p-1.5` ile serbest boyutlanıyor ve satırın
 * hizasını bozuyordu.
 *
 * Hover rengi marka tokenından gelir — org kendi rengini verdiğinde ikon
 * düğmeleri de döner (eskiden sabit `indigo-600` idi ve dönmüyordu).
 */
export function IconButton({ label, danger, disabled, onClick, children }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled ?? false}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg
        text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-brand-600'
        }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
