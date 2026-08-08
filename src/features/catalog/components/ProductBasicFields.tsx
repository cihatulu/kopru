import type { UseFormReturn } from 'react-hook-form';
import type { ProductForm } from '../domain/productSchema';
import type { ProductGroup } from '../api/useProductGroups';

interface Props {
  form: UseFormReturn<ProductForm>;
  groups: ProductGroup[];
  groupId: string | null;
  onGroupChange: (id: string | null) => void;
}

/** Ürünün temel alanları — ad, kod, fiyatlar, grup, boyut, stok. */
export function ProductBasicFields({ form, groups, groupId, onGroupChange }: Props) {
  const { register, formState } = form;
  const e = formState.errors;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ürün adı" error={e.name?.message}>
          <input className="input" autoFocus {...register('name')} />
        </Field>
        <Field label="Ürün kodu" error={e.code?.message}>
          <input className="input" {...register('code')} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Satış fiyatı (₺)" error={e.supplierPrice?.message}>
          <input className="input" type="number" step="0.01" {...register('supplierPrice')} />
          <p className="mt-1 text-xs text-slate-500">
            Perakendecinin göreceği fiyat. Cari hesap bu tutardan işler.
          </p>
        </Field>
        <Field label="Maliyetiniz (₺)" error={e.costPrice?.message}>
          <input className="input" type="number" step="0.01" {...register('costPrice')} />
          <p className="mt-1 text-xs text-slate-500">
            Yalnız size görünür. Boş bırakırsanız kaydedilmez.
          </p>
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
        </div>
        <Field label="Stok adedi" error={e.stock?.message}>
          <input className="input" type="number" step="1" {...register('stock')} />
          <p className="mt-1 text-xs text-slate-500">
            Boş bırakılırsa mevcut stok değişmez.
          </p>
        </Field>
      </div>

      <div>
        <label className="label">Ölçüler (cm)</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <input className="input" type="number" step="0.1" placeholder="En" {...register('width')} />
            {e.width && <p className="field-error">{e.width.message}</p>}
          </div>
          <div>
            <input className="input" type="number" step="0.1" placeholder="Boy" {...register('depth')} />
            {e.depth && <p className="field-error">{e.depth.message}</p>}
          </div>
          <div>
            <input
              className="input" type="number" step="0.1" placeholder="Yükseklik"
              {...register('height')}
            />
            {e.height && <p className="field-error">{e.height.message}</p>}
          </div>
        </div>
      </div>

      <Field label="Açıklama" error={e.description?.message}>
        <textarea className="input min-h-20" {...register('description')} />
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
