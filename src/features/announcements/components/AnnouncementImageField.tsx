interface Props {
  previewUrl: string;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}

/** Duyuru görseli seçimi ve önizlemesi. */
export function AnnouncementImageField({ previewUrl, disabled, onPick, onClear }: Props) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
        Görsel (İsteğe Bağlı)
      </label>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
        }}
        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer focus:outline-none"
      />
      {previewUrl && (
        <div className="mt-3 relative inline-block rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <img src={previewUrl} alt="Önizleme" className="h-24 w-auto object-cover" />
          <button
            type="button"
            aria-label="Görseli kaldır"
            disabled={disabled}
            onClick={onClear}
            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
