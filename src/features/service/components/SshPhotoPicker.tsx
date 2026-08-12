import { MAX_SSH_PHOTOS } from '../domain/sshDraft';

interface Props {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

/** Arıza fotoğrafları — en fazla üç adet, talep açıldıktan sonra yüklenir. */
export function SshPhotoPicker({ files, onAdd, onRemove }: Props) {
  const remaining = MAX_SSH_PHOTOS - files.length;

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
        FOTOĞRAFLAR (EN FAZLA {MAX_SSH_PHOTOS} ADET)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {files.map((file, idx) => (
          <div
            key={`${file.name}-${idx}`}
            className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs"
          >
            <img
              src={URL.createObjectURL(file)}
              alt="Sorunlu ürün önizleme"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-600 transition-colors shadow-xs"
            >
              ×
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <label className="w-full sm:w-auto flex-1 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center cursor-pointer transition-all p-3 text-center">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              <span>Fotoğraf Yükle</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {remaining} adet daha fotoğraf ekleyebilirsiniz.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onAdd(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
