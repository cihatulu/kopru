import {
  addVariant,
  addVariantOption,
  removeVariant,
  removeVariantOption,
  updateVariantName,
  updateVariantOption,
  type Variant,
} from '../domain/variants';

interface Props {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
}

/**
 * Ürün özellikleri (Renk, Kumaş, Ölçü…) ve seçenekleri.
 *
 * Varyant FİYATI ETKİLEMEZ — sipariş anında hangi seçeneğin alındığını
 * kaydetmek içindir. Fiyat farkı gerekiyorsa ayrı ürün açılır; aksi halde
 * üç fiyat katmanının (A4) her biri varyant sayısı kadar çoğalırdı.
 */
export function VariantEditor({ variants, onChange }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label mb-0">Özellikler</label>
        <button
          type="button"
          onClick={() => onChange(addVariant(variants))}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          + Özellik ekle
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="mt-1.5 text-xs text-slate-400">
          Henüz özellik eklenmedi. Renk, kumaş gibi seçenekler ekleyebilirsiniz.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {variants.map((v, i) => (
            <li key={i} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <input
                  className="input py-1.5 text-sm"
                  placeholder="Özellik adı (ör. Renk)"
                  value={v.name}
                  onChange={(e) => onChange(updateVariantName(variants, i, e.target.value))}
                  aria-label={`Özellik ${i + 1} adı`}
                />
                <button
                  type="button"
                  onClick={() => onChange(removeVariant(variants, i))}
                  aria-label="Özelliği kaldır"
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  Kaldır
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {v.options.map((o, j) => (
                  <span key={j} className="inline-flex items-center gap-1">
                    <input
                      className="input w-32 py-1 text-xs"
                      placeholder="Değer"
                      value={o}
                      onChange={(e) =>
                        onChange(updateVariantOption(variants, i, j, e.target.value))
                      }
                      aria-label={`${v.name || 'Özellik'} değer ${j + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => onChange(removeVariantOption(variants, i, j))}
                      aria-label="Değeri kaldır"
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onChange(addVariantOption(variants, i))}
                  className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-brand-500 hover:text-brand-600"
                >
                  + değer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
