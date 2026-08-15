interface Props {
  label: string;
  /** Yıkıcı eylem — kırmızı hover. Kalıcı silmede kullanılır. */
  danger?: boolean;
  onClick: () => void;
  /** SVG `path` içeriği; viewBox ve stroke ayarları burada verilir. */
  children: React.ReactNode;
}

/** Tablo satırlarındaki ikon eylem düğmesi. */
export function IconButton({ label, danger, onClick, children }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 ${
        danger ? 'hover:text-red-500' : 'hover:text-indigo-600'
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
