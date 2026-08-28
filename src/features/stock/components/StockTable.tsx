import { TH, THEAD } from '@/components/ui/Table';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StockTableRow } from './StockTableRow';
import { StockChangeMessage, type PendingStockChange } from './StockChangeMessage';
import { StockDeleteDialog, type PendingProductDelete } from './StockDeleteDialog';
import type { StockRow } from '../api/useStockList';
import { parseQuantity } from '../domain/csv';

interface Props {
  rows: StockRow[];
  groups: { id: string; name: string }[];
  busyId: string | undefined;
  onSave: (productId: string, quantity: number) => void;
}

const CATEGORY_COLORS = [
  'bg-teal-50 border-teal-200 text-teal-700',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-pink-50 border-pink-200 text-pink-700',
  'bg-blue-50 border-blue-200 text-blue-700',
] as const;

const categoryColor = (index: number): string =>
  CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? CATEGORY_COLORS[0];

export function StockTable({ rows, groups, busyId, onSave }: Props) {
  const [pending, setPending] = useState<PendingStockChange | null>(null);
  const [toDelete, setToDelete] = useState<PendingProductDelete | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-xs">
        <p className="text-sm text-slate-400">Ürün bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {rows.map((r) => {
          const groupName = groups.find((g) => g.id === r.groupId)?.name ?? null;
          const isBusy = busyId === r.productId;
          const dims =
            r.widthCm || r.depthCm || r.heightCm
              ? `${r.widthCm || '-'} x ${r.depthCm || '-'} x ${r.heightCm || '-'}`
              : '—';
          const features =
            r.variants.map((v) => `${v.name}: ${v.options.join('/')}`).join(', ') || '—';

          return (
            <div
              key={r.productId}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Görsel + Ad + Model + Stok Girişi */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="size-14 shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-150 flex items-center justify-center shadow-2xs">
                    {r.images.length > 0 ? (
                      <img src={r.images[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-slate-300 font-bold">Görsel Yok</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate" title={r.name}>
                        {r.name}
                      </span>
                      {!r.isActive && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-slate-400">{r.code || '—'}</p>
                    {groupName && (
                      <span className="inline-block mt-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-150">
                        {groupName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobilde Hızlı Stok Düzenleme Kutusu */}
                <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stok Adedi
                  </span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={r.quantity === null ? '' : r.quantity}
                    disabled={isBusy}
                    placeholder="0"
                    onBlur={(e) => {
                      const parsed = parseQuantity(e.target.value);
                      if (parsed !== null && parsed !== r.quantity && !isBusy) {
                        setPending({
                          productId: r.productId,
                          productName: r.name,
                          from: r.quantity,
                          to: parsed,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="w-20 text-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-extrabold text-slate-900 shadow-2xs focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  />
                </div>
              </div>

              {/* Kart Detay Izgarası */}
              <div className="grid grid-cols-2 gap-2.5 py-3 text-xs bg-slate-50/60 rounded-xl p-2.5 my-3 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Kategori
                  </span>
                  <span className="font-bold text-slate-700 block mt-0.5">
                    {r.category || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Ölçüler (E x B x Y)
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-700 block mt-0.5">
                    {dims}
                  </span>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Özellikler
                  </span>
                  <span className="text-slate-600 block mt-0.5 truncate" title={features}>
                    {features}
                  </span>
                </div>
              </div>

              {/* Pasif Ürün Silme Aksiyonu */}
              {!r.isActive && (
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setToDelete({ productId: r.productId, productName: r.name })}
                    disabled={isBusy}
                    className="rounded-lg px-3 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                  >
                    Ürünü Kalıcı Olarak Sil
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 8 Sütunlu Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto w-full scrollbar-thin table-scroll-shadow">
          <table className="min-w-[1000px] lg:min-w-full text-sm">
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
