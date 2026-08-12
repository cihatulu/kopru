import { Button } from './Button';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

const NAV_BTN =
  'relative inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-30 cursor-pointer';

/** Bellekteki liste için sayfa çubuğu — toplam sayı biliniyorken kullanılır. */
export function Pagination({ page, pageSize, total, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3.5 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Önceki
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sonraki
        </Button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Toplam <span className="font-semibold text-slate-800">{total}</span> kayıttan{' '}
          <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> ile{' '}
          <span className="font-semibold text-slate-800">{Math.min(page * pageSize, total)}</span>{' '}
          arası gösteriliyor
        </p>
        <nav
          className="isolate inline-flex -space-x-px rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          aria-label="Sayfalama"
        >
          <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className={NAV_BTN}>
            Önceki
          </button>
          <span className="relative inline-flex items-center px-4 py-2 text-xs font-bold text-slate-800 bg-slate-50 border-x border-slate-200">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className={NAV_BTN}
          >
            Sonraki
          </button>
        </nav>
      </div>
    </div>
  );
}
