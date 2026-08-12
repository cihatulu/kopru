import { StockTableRow } from './StockTableRow';
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
  'bg-indigo-50 border-indigo-200 text-indigo-700',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-pink-50 border-pink-200 text-pink-700',
  'bg-blue-50 border-blue-200 text-blue-700',
] as const;

const categoryColor = (index: number): string =>
  CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? CATEGORY_COLORS[0];

const TH = 'px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest';

export function StockTable({ rows, groups, busyId, onSave }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-350">
            📭
          </div>
          <p className="text-sm font-medium text-slate-400">Ürün bulunamadı.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full scrollbar-thin table-scroll-shadow">
        <table className="min-w-[1000px] lg:min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/80">
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className={TH}>Ürün Adı</th>
              <th className={TH}>Grup Adı</th>
              <th className={TH}>Model</th>
              <th className={TH}>Kategori</th>
              <th className={TH}>Ölçüler (E x B x Y)</th>
              <th className={TH}>Özellikler</th>
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
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
