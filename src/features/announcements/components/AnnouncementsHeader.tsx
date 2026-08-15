interface Props {
  isManufacturer: boolean;
  onCreate: () => void;
}

/** Duyurular sayfasının başlığı; yayınlama eylemi yalnız üreticide görünür. */
export function AnnouncementsHeader({ isManufacturer, onCreate }: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isManufacturer ? 'Duyuru Yönetimi' : 'Duyurular'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {isManufacturer
            ? 'Müşterilerinize iletmek istediğiniz kampanya veya bilgilendirmeleri yayınlayın.'
            : 'Tedarikçilerinizin yayınladığı duyurular.'}
        </p>
      </div>
      {isManufacturer && (
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-slate-700 active:scale-95 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Duyuru Yayınla
        </button>
      )}
    </div>
  );
}
