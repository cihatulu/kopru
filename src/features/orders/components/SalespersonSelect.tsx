export interface SalespersonOption {
  id: string;
  label: string;
}

interface Props {
  options: SalespersonOption[];
  value: string;
  onChange: (userId: string) => void;
}

/**
 * Satışı yapan personel — ZORUNLU.
 *
 * Raporlardaki personel kırılımı bu alana dayanır; boş bırakılırsa sipariş
 * hangi satışçıya ait olduğu belirsiz kalır ve sunucu da reddeder.
 */
export function SalespersonSelect({ options, value, onChange }: Props) {
  return (
    <div className="w-full sm:w-72">
      <label
        htmlFor="cart-salesperson"
        className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5"
      >
        Satışçı <span className="text-red-500">*</span>
      </label>
      <select
        id="cart-salesperson"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`w-full text-sm px-3.5 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all ${
          value ? 'border-slate-200 text-slate-800' : 'border-red-300 text-slate-500'
        }`}
      >
        <option value="">— Satışı yapan personeli seçin —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      {options.length === 0 && (
        <p className="mt-1 text-[11px] text-red-600 font-semibold">
          Aktif personel bulunamadı. Ekip Yönetimi'nden personel ekleyin.
        </p>
      )}
    </div>
  );
}
