interface Option {
  id: string;
  manufacturerOrgId: string;
  companyName: string;
}

interface Props {
  options: Option[];
  /** Seçili üreticinin org kimliği; hepsi seçiliyse boş. */
  value: string;
  onChange: (manufacturerOrgId: string) => void;
}

/**
 * Katalogdaki tedarikçi seçici.
 *
 * Sayfanın içinde kendi kabuğunu kuran bir seçiciydi: dış çerçeve, iç
 * etiket ve şeffaf bir `<select>`. Yanındaki düğmeyle aynı yükseklikte
 * değildi ve tıklanabilir alanı görünen kutudan küçüktü. Etiket dışarı
 * alındı, seçici ortak `.select` sınıfına bağlandı.
 */
export function ManufacturerPicker({ options, value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Üretici</span>
      <select
        aria-label="Üretici seçimi"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Tüm Üreticiler</option>
        {options.map((o) => (
          <option key={o.id} value={o.manufacturerOrgId}>
            {o.companyName}
          </option>
        ))}
      </select>
    </label>
  );
}
