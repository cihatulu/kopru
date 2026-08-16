interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** Erişilebilirlik için grubun adı, ör. "Ürün durumu". */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * İki-üç seçenekli görünüm anahtarı (Aktif/Pasif, Genel/Detay).
 *
 * Uygulamada üç ayrı yerde elle yazılmıştı ve üçü de farklı ölçüdeydi.
 * Dış kabuk 36px — `Button`'ın `md` boyutuyla aynı, çünkü hep bir düğme
 * satırının içinde duruyor ve onunla aynı çizgide bitmesi gerekiyor.
 *
 * `radiogroup` değil `tablist` de değil: seçenekler bir görünüm süzgeci,
 * form değeri değil. `aria-pressed` en doğrusunu anlatıyor.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 shrink-0 items-center rounded-lg bg-slate-100 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold whitespace-nowrap
            transition-colors ${
              value === o.value
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
