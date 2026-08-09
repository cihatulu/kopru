import { formatMoney } from '@/lib/format';
import type { DerivedField } from '@/components/ui/useDerivedField';

interface Props {
  cost: DerivedField;
  price: DerivedField;
  stock: string;
  onStock: (v: string) => void;
  description: DerivedField;
  /** İçeriğin toplam satış fiyatı — kullanıcıya referans olarak gösterilir. */
  total: number;
  /** İçerikte maliyeti bilinmeyen ürün var mı. */
  costUnknown: boolean;
}

/** Takımın fiyat, maliyet, stok ve açıklama alanları — hepsi içerikten türetilir. */
export function SetPricingFields({
  cost,
  price,
  stock,
  onStock,
  description,
  total,
  costUnknown,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Maliyet (₺)">
          <input
            className="input"
            inputMode="decimal"
            value={cost.value}
            onChange={(e) => cost.onChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            {costUnknown ? 'Maliyeti bilinmeyen ürün var' : 'İçerik toplamı'}
          </p>
        </Field>

        <Field label="Satış fiyatı (₺)">
          <input
            className="input"
            inputMode="decimal"
            value={price.value}
            onChange={(e) => price.onChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Toplam: {formatMoney(total)}</p>
        </Field>

        <Field label="Stok adedi">
          <input
            className="input"
            inputMode="numeric"
            value={stock}
            onChange={(e) => onStock(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Açıklama">
        <textarea
          className="input min-h-32"
          value={description.value}
          onChange={(e) => description.onChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          İçerik listesi ve ürünlerin kendi açıklamaları birleştirildi.
        </p>
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
