import type { UseFormReturn } from 'react-hook-form';
import type { ProductForm } from '../domain/productSchema';
import type { ProductGroup } from '../api/useProductGroups';

interface Props {
  form: UseFormReturn<ProductForm>;
  groups: ProductGroup[];
  groupId: string | null;
  /** Daha önce kullanılmış kategoriler — yazım tutarlılığı için öneri listesi. */
  categories: string[];
  isRetailer?: boolean | undefined;
  onGroupChange: (id: string | null) => void;
}

/**
 * Ürünün temel alanları.
 *
 * Sıralama hiyerarşiyi izler: GRUP (en üst kırılım) → KATEGORİ → MODEL.
 * Alan sırası kullanıcının kafasındaki sırayla aynı olmalı; aksi halde
 * kategoriyi grubun üstünde sanır.
 */
export function ProductBasicFields({ form, groups, groupId, categories, isRetailer, onGroupChange }: Props) {
  const { register, formState } = form;
  const e = formState.errors;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ürün adı" error={e.name?.message}>
          <input className="input" autoFocus {...register('name')} />
        </Field>
        <Field label="Model" error={e.code?.message}>
          <input className="input" {...register('code')} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="group">
            Grup
          </label>
          <select
            id="group"
            className="input"
            value={groupId ?? ''}
            onChange={(ev) => onGroupChange(ev.target.value || null)}
          >
            <option value="">Grupsuz</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">En üst kırılım.</p>
        </div>
        <Field label="Kategori" error={e.category?.message}>
          <input className="input" list="urun-kategorileri" {...register('category')} />
          {/* Serbest metin ama daha önce yazdıklarınız öneriliyor: aynı kategoriyi
              iki farklı yazıp iki ayrı kategori oluşturma riskini azaltır. */}
          <datalist id="urun-kategorileri">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">Grubun altındaki kırılım.</p>
        </Field>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-600">
          Ürün ölçüleri (cm)
        </legend>
        <div className="grid grid-cols-3 gap-3 items-end">
          <Field
            label="Genişlik (En)"
            error={e.width?.message}
            labelClassName="min-h-[2.25rem] flex items-end justify-center text-center pb-1"
          >
            <input className="input text-center font-medium" type="number" step="0.1" placeholder="cm" {...register('width')} />
          </Field>
          <Field
            label="Derinlik (Boy)"
            error={e.depth?.message}
            labelClassName="min-h-[2.25rem] flex items-end justify-center text-center pb-1"
          >
            <input className="input text-center font-medium" type="number" step="0.1" placeholder="cm" {...register('depth')} />
          </Field>
          <Field
            label="Yükseklik (Yük.)"
            error={e.height?.message}
            labelClassName="min-h-[2.25rem] flex items-end justify-center text-center pb-1"
          >
            <input className="input text-center font-medium" type="number" step="0.1" placeholder="cm" {...register('height')} />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label={isRetailer ? "Alış maliyeti (₺)" : "Maliyet fiyatı (₺)"}
          error={isRetailer ? e.supplierPrice?.message : e.costPrice?.message}
          labelClassName="min-h-[1.5rem] flex items-end"
        >
          <input
            className="input font-medium"
            type="number"
            step="0.01"
            placeholder="₺0,00"
            {...register(isRetailer ? 'supplierPrice' : 'costPrice')}
          />
          <p className="mt-1 text-xs text-slate-500">
            {isRetailer ? "Tedarikçinizden alış maliyetiniz." : "Yalnız size görünür."}
          </p>
        </Field>
        <Field
          label="Satış fiyatı (₺)"
          error={isRetailer ? e.costPrice?.message : e.supplierPrice?.message}
          labelClassName="min-h-[1.5rem] flex items-end"
        >
          <input
            className="input font-medium"
            type="number"
            step="0.01"
            placeholder="₺0,00"
            {...register(isRetailer ? 'costPrice' : 'supplierPrice')}
          />
          <p className="mt-1 text-xs text-slate-500">
            {isRetailer ? "Müşterilerinize perakende satış fiyatınız." : "Perakendecinin göreceği fiyat."}
          </p>
        </Field>
        <Field label="Genel stok adedi" error={e.stock?.message} labelClassName="min-h-[1.5rem] flex items-end">
          <input className="input font-medium" type="number" step="1" placeholder="0" {...register('stock')} />
          <p className="mt-1 text-xs text-slate-500">Boşsa stok değişmez.</p>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  labelClassName,
  children,
}: {
  label: string;
  error?: string | undefined;
  labelClassName?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col justify-between h-full">
      <span className={`label ${labelClassName ?? ''}`}>{label}</span>
      <div className="flex-1 flex flex-col justify-end">{children}</div>
      {error && <p className="field-error">{error}</p>}
    </label>
  );
}
