interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/*
  Bitişik grup olduğu için `Button` kullanılmaz — yuvarlak köşeler ve
  gölge grubun içinde tekrarlanırdı. Yükseklik `Button`'ın `sm` boyutuyla
  (32px) aynı tutulur; yanındaki düğmelerle aynı çizgide durması gerekir.
*/
const NAV_BTN =
  'relative inline-flex h-8 items-center px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:z-20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer';

/** Bellekteki liste için sayfa çubuğu — toplam sayı biliniyorken kullanılır. */
export function Pagination({ page, pageSize, total, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-3 sm:px-6 mt-4 rounded-xl">
      <div className="flex w-full items-center justify-between gap-2 flex-nowrap">
        <p className="text-xs text-slate-500 shrink-0">
          Toplam <span className="font-semibold text-slate-800">{total}</span> kayıt
        </p>

        <nav
          className="isolate inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xs shrink-0"
          aria-label="Sayfalama"
        >
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className={NAV_BTN}
          >
            ← Önceki
          </button>
          <span className="relative inline-flex h-8 items-center border-x border-slate-300 bg-slate-50 px-3 text-xs font-bold tabular-nums text-slate-800 font-mono">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className={NAV_BTN}
          >
            Sonraki →
          </button>
        </nav>
      </div>
    </div>
  );
}
