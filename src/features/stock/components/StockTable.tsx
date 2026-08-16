import { TH, THEAD } from '@/components/ui/Table';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StockTableRow } from './StockTableRow';
import { StockChangeMessage, type PendingStockChange } from './StockChangeMessage';
import { StockDeleteDialog, type PendingProductDelete } from './StockDeleteDialog';
import type { StockRow } from '../api/useStockList';

interface Props {
  rows: StockRow[];
  groups: { id: string; name: string }[];
  busyId: string | undefined;
  onSave: (productId: string, quantity: number) => void;
}

// `as const` demet yapar: sabit indeksle okunduğunda tip `string`, `string |
// undefined` değil (noUncheckedIndexedAccess).
const CATEGORY_COLORS = [
  // Marka rengi kategori paletine GİRMEZ: birincil eyleme ayrılmıştır,
  // rastgele bir kategoriyi onunla boyamak anlamı bulandırırdı.
  'bg-teal-50 border-teal-200 text-teal-700',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-pink-50 border-pink-200 text-pink-700',
  'bg-blue-50 border-blue-200 text-blue-700',
] as const;

const categoryColor = (index: number): string =>
  CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? CATEGORY_COLORS[0];

export function StockTable({ rows, groups, busyId, onSave }: Props) {
  // Onay tabloda tutulur: satır yalnız "şunu yapmak istiyorum" der, kaydı
  // kullanıcı onaylayınca üst katman yazar. Tek tık kazayla stok bozmasın.
  const [pending, setPending] = useState<PendingStockChange | null>(null);
  const [toDelete, setToDelete] = useState<PendingProductDelete | null>(null);

  if (rows.length === 0) {
    return (
      /* `text-slate-350` yazılıydı — Tailwind'de 350 tonu yok. Emoji ile
         birlikte kaldırıldı; boş durum diğer tablolarla aynı dilde. */
      <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-xs">
        <p className="text-sm text-slate-400">Ürün bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto w-full scrollbar-thin table-scroll-shadow">
        <table className="min-w-[1000px] lg:min-w-full text-sm">
          {/* Uzun listede sütun adı kaybolmasın diye yapışkan. */}
          <thead className={`sticky top-0 z-10 ${THEAD}`}>
            <tr>
              <th className={TH}>Ürün Adı</th>
              <th className={TH}>Grup Adı</th>
              <th className={TH}>Model</th>
              <th className={TH}>Kategori</th>
              <th className={TH}>Ölçüler (E x B x Y)</th>
              <th className={TH}>Özellikler</th>
              <th className={`${TH} text-center`}>İşlem</th>
              <th className={`${TH} text-center w-[120px]`}>Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {rows.map((r, idx) => (
              <StockTableRow
                key={r.productId}
                row={r}
                groupName={groups.find((g) => g.id === r.groupId)?.name ?? null}
                categoryBadgeColor={categoryColor(idx)}
                busy={busyId === r.productId}
                onDelete={() => setToDelete({ productId: r.productId, productName: r.name })}
                onRequestSave={(quantity) =>
                  setPending({
                    productId: r.productId,
                    productName: r.name,
                    from: r.quantity,
                    to: quantity,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {pending && (
        <ConfirmDialog
          title="Stoğu güncelle"
          message={<StockChangeMessage change={pending} />}
          confirmLabel="Evet, güncelle"
          pending={busyId === pending.productId}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onSave(pending.productId, pending.to);
            setPending(null);
          }}
        />
      )}

      {toDelete && (
        <StockDeleteDialog target={toDelete} onClose={() => setToDelete(null)} />
      )}
    </div>
  );
}
