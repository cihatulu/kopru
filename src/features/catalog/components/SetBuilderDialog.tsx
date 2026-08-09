import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useDerivedField } from '@/components/ui/useDerivedField';
import { parseDecimal } from '@/lib/format';
import {
  canBuildSet,
  clampQuantity,
  composeSetDescription,
  suggestedCost,
  suggestedPrice,
  type SetLineInput,
} from '../domain/setBuilder';
import { SetLineList } from './SetLineList';
import { SetPricingFields } from './SetPricingFields';
import type { CatalogProduct } from '../api/useProducts';

export interface SetSubmit {
  name: string;
  code: string;
  category: string;
  price: number;
  cost: number | undefined;
  stock: number;
  description: string;
  contents: { productId: string; quantity: number }[];
}

interface Props {
  selected: CatalogProduct[];
  costs: Record<string, number> | undefined;
  /** Daha önce kullanılmış kategoriler — öneri listesi. */
  categories: string[];
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: SetSubmit) => void;
}

/** "Set Oluştur" — seçili tek ürünlerden takım kurar. */
export function SetBuilderDialog(props: Props) {
  const { selected, costs, categories, pending, errorMessage, onClose, onSubmit } = props;

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(selected.map((p) => [p.id, 1])),
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('0');

  const lines: SetLineInput[] = useMemo(
    () =>
      selected.map((p) => ({
        productId: p.id,
        name: p.name,
        unitPrice: p.supplierPrice,
        unitCost: costs?.[p.id],
        description: p.description,
        quantity: quantities[p.id] ?? 0,
      })),
    [selected, costs, quantities],
  );

  const total = suggestedPrice(lines);
  const totalCost = suggestedCost(lines);
  const buildable = canBuildSet(lines);
  const ready = buildable && name.trim().length >= 2 && code.trim().length >= 1;

  // Üçü de içerikten türetilir, kullanıcı yazana kadar.
  const price = useDerivedField(String(total));
  const cost = useDerivedField(totalCost === null ? '' : String(totalCost));
  const description = useDerivedField(composeSetDescription(lines));

  return (
    <Modal
      label="Yeni set (takım) oluştur"
      panelClassName="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">Yeni Set (Takım) Oluştur</h2>
      <p className="mt-1 text-sm text-slate-500">
        Seçtiğiniz ürünlerden bir takım kurulur. Fiyat, maliyet ve açıklama içerikten otomatik
        gelir; hepsini değiştirebilirsiniz.
      </p>

      <div className="mt-5">
        <SetLineList
          lines={lines}
          onQuantityChange={(id, q) =>
            setQuantities((prev) => ({ ...prev, [id]: clampQuantity(q) }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Takım adı">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Model">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
      </div>

      <Field label="Kategori">
        <input
          className="input"
          list="set-kategorileri"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="set-kategorileri">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <SetPricingFields
        cost={cost}
        price={price}
        stock={stock}
        onStock={setStock}
        description={description}
        total={total}
        costUnknown={totalCost === null}
      />

      {!buildable && (
        <p className="mt-3 text-xs font-medium text-amber-700">
          Takım en az iki kalem içermeli. Miktarı 0 olan ürünler takıma girmez.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          İptal
        </Button>
        <Button
          loading={pending}
          disabled={!ready}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              code: code.trim(),
              category: category.trim(),
              price: parseDecimal(price.value) ?? total,
              cost: parseDecimal(cost.value) ?? undefined,
              stock: parseDecimal(stock) ?? 0,
              description: description.value,
              contents: lines
                .filter((l) => l.quantity > 0)
                .map((l) => ({ productId: l.productId, quantity: l.quantity })),
            })
          }
        >
          Takımı oluştur
        </Button>
      </div>
    </Modal>
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
