import type { SshItemSelection } from '../domain/sshDraft';

interface Props {
  items: SshItemSelection[];
  customProductName: string;
  onToggle: (id: string) => void;
  onQtyChange: (id: string, delta: number) => void;
  onCustomNameChange: (value: string) => void;
}

const STEP_BTN =
  'w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 disabled:opacity-40 cursor-pointer';

/** Siparişin kalemleri; sipariş yoksa ürün adı elle yazılır. */
export function SshItemPicker({
  items,
  customProductName,
  onToggle,
  onQtyChange,
  onCustomNameChange,
}: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
        PROBLEMLİ ÜRÜNLERİ SEÇİN <span className="text-red-500">*</span>
      </label>

      {items.length === 0 ? (
        <input
          type="text"
          placeholder="Ürün adı veya kodu giriniz..."
          value={customProductName}
          onChange={(e) => onCustomNameChange(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                item.selected
                  ? 'border-blue-400 bg-blue-50/40 shadow-2xs'
                  : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Sipariş Edilen Adet:{' '}
                    <span className="font-bold text-slate-600">{item.maxQty}</span>
                  </p>
                </div>
              </label>

              {item.selected && (
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs flex-shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-500">Talep Adedi:</span>
                  <button
                    type="button"
                    onClick={() => onQtyChange(item.id, -1)}
                    disabled={item.qty <= 1}
                    className={STEP_BTN}
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-extrabold text-slate-900">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => onQtyChange(item.id, 1)}
                    disabled={item.qty >= item.maxQty}
                    className={STEP_BTN}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
