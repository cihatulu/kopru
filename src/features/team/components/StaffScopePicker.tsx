interface Props {
  retailers: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

/**
 * Personelin sorumlu olduğu müşteriler.
 *
 * Kapsam boş bırakılırsa personel HİÇBİR müşteriyi göremez — bilinçli karar,
 * ama sahibin bunu bilmesi için altta uyarı duruyor.
 */
export function StaffScopePicker({ retailers, selectedIds, onToggle }: Props) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
        <span>Sorumlu Olduğu Bayiler</span>
        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 font-extrabold px-3 py-1 rounded-full shadow-sm">
          {selectedIds.length} Bayi Seçildi
        </span>
      </h4>

      <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-200/60 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 shadow-inner">
        {retailers.map((retailer) => {
          const isChecked = selectedIds.includes(retailer.id);
          return (
            <button
              key={retailer.id}
              type="button"
              onClick={() => onToggle(retailer.id)}
              className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all text-left ${
                isChecked
                  ? 'bg-blue-50/80 border-blue-200 shadow-sm ring-1 ring-blue-300'
                  : 'bg-white border-slate-100 hover:border-slate-350 hover:shadow-sm'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                readOnly
                tabIndex={-1}
                className="h-4.5 w-4.5 text-slate-800 rounded border-slate-300 focus:ring-slate-800 cursor-pointer"
              />
              <span className="min-w-0 text-xs font-bold text-slate-850 truncate">
                {retailer.name}
              </span>
            </button>
          );
        })}

        {retailers.length === 0 && (
          <p className="col-span-2 text-center text-xs text-slate-400 py-8 italic font-semibold">
            Tanımlı bayiniz bulunmuyor.
          </p>
        )}
      </div>

      <p className="text-[10px] text-slate-400 mt-2.5 font-bold italic">
        * Personeliniz sadece burada seçtiğiniz bayilerin işlemlerini görebilecektir.
      </p>
    </div>
  );
}
