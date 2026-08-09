import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMoney, parseDecimal } from '@/lib/format';
import {
  canBuildSet,
  clampQuantity,
  describeSet,
  suggestedCost,
  suggestedPrice,
  type SetLineInput,
} from '../domain/setBuilder';
import { SetLineList } from './SetLineList';
import type { CatalogProduct } from '../api/useProducts';

export interface SetSubmit {
  name: string;
  code: string;
  price: number;
  cost: number | undefined;
  stock: number;
  description: string;
  contents: { productId: string; quantity: number }[];
}

interface Props {
  selected: CatalogProduct[];
  costs: Record<string, number> | undefined;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: SetSubmit) => void;
}

/** "Set Oluştur" — seçili tek ürünlerden takım kurar. */
export function SetBuilderDialog(props: Props) {
  const { selected, costs, pending, errorMessage, onClose, onSubmit } = props;

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(selected.map((p) => [p.id, 1])),
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [stock, setStock] = useState('0');
  const [priceText, setPriceText] = useState('');
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [description, setDescription] = useState('');

  const lines: SetLineInput[] = useMemo(
    () =>
      selected.map((p) => ({
        productId: p.id,
        name: p.name,
        unitPrice: p.supplierPrice,
        unitCost: costs?.[p.id],
        quantity: quantities[p.id] ?? 0,
      })),
    [selected, costs, quantities],
  );

  const total = suggestedPrice(lines);
  const cost = suggestedCost(lines);
  const auto = describeSet(lines);
  const buildable = canBuildSet(lines);
  const ready = buildable && name.trim().length >= 2 && code.trim().length >= 1;

  return (
    <Modal
      label={'Yeni set (takım) oluştur'}
      panelClassName={
        'flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">Yeni Set (Takım) Oluştur</h2>
      <p className="mt-1 text-sm text-slate-500">
        Seçtiğiniz ürünlerden bir takım kurulur. Takım kendi stoğu ve fiyatıyla ayrı bir ürün olarak
        listelenir.
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
        <Field label="Model / kod">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Takım fiyatı (₺)">
          <input
            className="input"
            inputMode="decimal"
            placeholder={String(total)}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
          />
          {/* Boş bırakılırsa içerik toplamı kullanılır — kullanıcı elle toplamasın. */}
          <p className="mt-1 text-xs text-slate-500">İçerik toplamı: {formatMoney(total)}</p>
        </Field>
        <Field label="Stok adedi">
          <input
            className="input"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Maliyet: {cost === null ? 'hesaplanamıyor' : formatMoney(cost)}
          </p>
        </Field>
      </div>

      <Field label="Açıklama">
        <textarea
          className="input"
          rows={2}
          value={descriptionEdited ? description : auto}
          onChange={(e) => {
            setDescriptionEdited(true);
            setDescription(e.target.value);
          }}
        />
      </Field>

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
              price: priceText.trim() === '' ? total : (parseDecimal(priceText) ?? total),
              cost: cost ?? undefined,
              stock: parseDecimal(stock) ?? 0,
              description: descriptionEdited ? description : auto,
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
    <div className="mt-3">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
