interface Props {
  showPassive: boolean;
  passiveCount: number;
  onTogglePassive: () => void;
  onAdd: () => void;
}

/** Müşteri Yönetimi başlığı ve aksiyonları — kaynak ekranın karşılığı. */
export function CustomerHeader({ showPassive, passiveCount, onTogglePassive, onAdd }: Props) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Müşteri Yönetimi</h1>
        <p className="text-xs text-slate-400">
          Müşterilerinizi, bayilerinizi ve cari kartlarını buradan kolayca yönetebilirsiniz.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTogglePassive}
          aria-pressed={showPassive}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border px-4 text-[13px] font-bold transition-all ${
            showPassive
              ? 'border-slate-800 bg-slate-800 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
          }`}
        >
          <span
            className={`size-2 shrink-0 rounded-full ${showPassive ? 'bg-red-400' : 'bg-emerald-400'}`}
          />
          {showPassive ? 'Pasif Müşterileri Gösteriyorsunuz' : 'Aktif Müşteriler'}
          {passiveCount > 0 && !showPassive && (
            <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
              {passiveCount} pasif
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Yeni Müşteri Ekle
        </button>
      </div>
    </div>
  );
}
