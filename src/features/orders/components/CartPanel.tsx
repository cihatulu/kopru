import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';
import { cartTotals, lineTotal, type CartLine } from '../domain/cart';

interface Props {
  lines: CartLine[];
  pending: boolean;
  errorMessage?: string | undefined;
  onQuantity: (productId: string, quantity: number) => void;
  onRetailPrice: (productId: string, price: number | undefined) => void;
  onSubmit: () => void;
}

/**
 * Sepet. İki fiyat yan yana görünür ama farklı yerlere gider (A4):
 * alış fiyatı siparişe ve cariye, satış fiyatı yalnız perakendecinin
 * göreceği ayrı tabloya yazılır — üretici onu hiçbir zaman görmez.
 */
export function CartPanel({
  lines,
  pending,
  errorMessage,
  onQuantity,
  onRetailPrice,
  onSubmit,
}: Props) {
  const totals = cartTotals(lines);

  if (lines.length === 0) {
    return (
      <aside className="rounded-xl bg-white p-5 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Sepet boş. Katalogdan ürün ekleyin.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200">
      <h3 className="text-sm font-bold text-slate-900">Sepet ({totals.lineCount} kalem)</h3>

      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.productId} className="border-b border-slate-100 pb-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{l.name}</p>
                <p className="font-mono text-xs text-slate-500">{l.code}</p>
              </div>
              <p className="whitespace-nowrap text-sm font-medium text-slate-900">
                {formatMoney(lineTotal(l))}
              </p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-500">Adet</span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={l.quantity}
                  onChange={(e) => onQuantity(l.productId, Number(e.target.value))}
                  className="input py-1.5 text-sm"
                  aria-label={`${l.name} adet`}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Satış fiyatım</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.retailPrice ?? ''}
                  placeholder="isteğe bağlı"
                  onChange={(e) =>
                    onRetailPrice(
                      l.productId,
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                  className="input py-1.5 text-sm"
                  aria-label={`${l.name} satış fiyatı`}
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-400">Alış: {formatMoney(l.unitPrice)}</p>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 border-t border-slate-200 pt-3 text-sm">
        <Row label="Sipariş tutarı" value={formatMoney(totals.supplierTotal)} strong />
        <Row
          label="Beklenen ciro"
          value={totals.retailTotal === null ? 'fiyat girin' : formatMoney(totals.retailTotal)}
        />
        <Row
          label="Beklenen kâr"
          value={totals.expectedProfit === null ? '—' : formatMoney(totals.expectedProfit)}
        />
      </dl>

      <p className="text-xs leading-relaxed text-slate-400">
        Satış fiyatınız ve kârınız yalnız size görünür; üreticiye iletilmez.
      </p>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <Button className="w-full" loading={pending} onClick={onSubmit}>
        Siparişi ver
      </Button>
    </aside>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'font-bold text-slate-900' : 'text-slate-700'}>{value}</dd>
    </div>
  );
}
