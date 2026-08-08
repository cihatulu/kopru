import { formatMoney } from '@/lib/format';
import { addSetLine, canAddToSet, setLineQuantity, type SetLine } from '../domain/variants';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  lines: SetLine[];
  /** Sete konulabilecek ürünler — kendi kataloğunuz. */
  available: CatalogProduct[];
  /** Düzenlenen ürünün id'si; kendi setine eklenmesini engellemek için. */
  editingId?: string | undefined;
  onChange: (lines: SetLine[]) => void;
}

/** Set ürünün içeriği: hangi üründen kaç adet. */
export function SetEditor({ lines, available, editingId, onChange }: Props) {
  const byId = new Map(available.map((p) => [p.id, p]));
  const selectable = available.filter(
    (p) => canAddToSet(p.id, editingId) && !lines.some((l) => l.productId === p.id),
  );

  const total = lines.reduce(
    (sum, l) => sum + (byId.get(l.productId)?.supplierPrice ?? 0) * l.quantity,
    0,
  );

  return (
    <div>
      <label className="label">Set içeriği</label>

      {lines.length === 0 ? (
        <p className="text-xs text-slate-400">Sete henüz ürün eklenmedi.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((l) => {
            const p = byId.get(l.productId);
            return (
              <li
                key={l.productId}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900">{p?.name ?? 'Bilinmeyen ürün'}</p>
                  <p className="font-mono text-xs text-slate-500">{p?.code ?? ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={l.quantity}
                    onChange={(e) =>
                      onChange(setLineQuantity(lines, l.productId, Number(e.target.value)))
                    }
                    aria-label={`${p?.name ?? 'Ürün'} adedi`}
                    className="input w-20 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(setLineQuantity(lines, l.productId, 0))}
                    aria-label="Setten çıkar"
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          İçeriğin ayrı ayrı toplamı: <strong>{formatMoney(total)}</strong> — setin kendi
          satış fiyatı bundan bağımsızdır.
        </p>
      )}

      {selectable.length > 0 ? (
        <select
          className="input mt-2 py-1.5 text-sm"
          value=""
          onChange={(e) => e.target.value && onChange(addSetLine(lines, e.target.value))}
          aria-label="Sete ürün ekle"
        >
          <option value="">+ Ürün ekle…</option>
          {selectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Eklenebilecek başka ürün kalmadı.</p>
      )}
    </div>
  );
}
