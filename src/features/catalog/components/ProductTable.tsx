import { TBODY, TH, THEAD } from '@/components/ui/Table';
import { ProductRow } from './ProductRow';
import type { CatalogProduct } from '../api/useProducts';
import { formatMoney } from '@/lib/format';
import { marginPercent } from '../domain/productSchema';
import { netProfit } from '../domain/productStats';
import { IconButton } from '@/components/ui/IconButton';

interface Props {
  products: CatalogProduct[];
  /** Yalnız üretici görünümünde dolu gelir; perakendecide RLS boş döndürür (A4). */
  costs: Record<string, number> | undefined;
  stock: Record<string, number> | undefined;
  groupNames: Map<string, string>;
  /** Kalıcı silme yetkisi — yalnız org sahibi. */
  canDelete: boolean;
  selectedIds: Set<string>;
  isGuest?: boolean;
  onSaveCost?: (productId: string, costPrice: number) => void;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], selectAll: boolean) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
}

/** Üreticinin katalog yönetimi tablosu — Masaüstünde 11 sütunlu tablo, mobilde Akıllı Kartlar. */
export function ProductTable(props: Props) {
  const { products, costs, stock, groupNames, selectedIds, isGuest, onSaveCost } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Aradığınız kriterlere uygun ürün bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {/* Mobilde Tümünü Seç Kontrolü */}
        <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              aria-label="Tümünü seç"
              checked={allSelected}
              onChange={() => props.onToggleAll(ids, !allSelected)}
              className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
            />
            <span>Tümünü Seç ({selectedIds.size}/{products.length})</span>
          </label>
        </div>

        {products.map((p) => {
          const isSelected = selectedIds.has(p.id);
          const cost = costs?.[p.id];
          const qty = stock?.[p.id] ?? null;
          const groupName = p.groupId ? (groupNames.get(p.groupId) ?? null) : null;
          const profit = netProfit(p.supplierPrice, cost);
          const margin = marginPercent(p.supplierPrice, cost);
          const firstImage = p.images?.[0];

          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/20 shadow-md ring-1 ring-brand-500/20'
                  : 'border-slate-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80'
              }`}
            >
              {/* Kart Başlığı: Sol (Seçim + Görsel + Bilgi) | Sağ (Düzenle & Pasife Al Butonları) */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    aria-label={`${p.name} seç`}
                    checked={isSelected}
                    onChange={() => props.onToggleOne(p.id)}
                    className="size-4 mt-1 cursor-pointer rounded border-slate-300 text-slate-900 shrink-0"
                  />

                  {/* Ürün Görseli */}
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100 shadow-2xs">
                    {firstImage ? (
                      <img src={firstImage} alt={p.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-slate-400 font-bold">
                        Görsel Yok
                      </div>
                    )}
                    {p.type === 'set' && (
                      <span className="absolute bottom-1 left-1 rounded bg-slate-900/90 px-1 text-[9px] font-black text-white">
                        SET
                      </span>
                    )}
                  </div>

                  {/* Ürün Bilgisi */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate" title={p.name}>
                        {p.name}
                      </span>
                      {!p.isActive && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-slate-400">{p.code}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                      {groupName && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                          {groupName}
                        </span>
                      )}
                      {p.category && (
                        <span className="text-slate-400 font-medium">{p.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sağ Üst Aksiyon Butonları (Kullanıcının İşaretlediği Yer) */}
                {!isGuest && (
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => props.onEdit(p)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs w-full"
                    >
                      <svg className="size-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      <span>Düzenle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => props.onToggleActive(p)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors shadow-2xs w-full ${
                        p.isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <span>{p.isActive ? 'Pasife Al' : 'Aktife Al'}</span>
                    </button>

                    {props.canDelete && !p.isActive && (
                      <IconButton
                        label="Sil"
                        size="sm"
                        onClick={() => props.onDelete(p)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </IconButton>
                    )}
                  </div>
                )}
              </div>

              {/* Kart Finans & Stok Izgarası */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Stok Durumu
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        qty === null
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : qty <= 0
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : qty <= 3
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          qty === null
                            ? 'bg-slate-400'
                            : qty <= 0
                            ? 'bg-red-500'
                            : qty <= 3
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      {qty === null ? '—' : `${qty} Adet`}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Satış Fiyatı
                  </span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    {formatMoney(p.supplierPrice)}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Maliyet
                  </span>
                  <span className="font-bold text-slate-700 block mt-0.5">
                    {cost !== undefined ? formatMoney(cost) : '—'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Net Kâr (Marj)
                  </span>
                  <span className="font-black text-emerald-600 block mt-0.5">
                    {profit !== undefined ? formatMoney(profit) : '—'}
                    {margin !== undefined && (
                      <span className="text-[11px] font-bold text-emerald-700 ml-1">
                        (%{margin})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 11 Sütunlu Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-[1000px] lg:min-w-full">
          <thead className={THEAD}>
            <tr>
              <th className="w-10 px-4 py-2.5 text-left">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={() => props.onToggleAll(ids, !allSelected)}
                  className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
                />
              </th>
              <th className={TH}>Ürün Adı</th>
              <th className={TH}>Grup</th>
              <th className={TH}>Model</th>
              <th className={TH}>Kategori</th>
              <th className={TH}>Stok</th>
              <th className={TH}>Maliyet</th>
              <th className={TH}>Satış Fiyatı</th>
              <th className={TH}>Net Kâr</th>
              <th className={`${TH} w-28`}>Kâr Marjı</th>
              <th className={`${TH} w-24 text-center`}>İşlemler</th>
            </tr>
          </thead>

          <tbody className={`${TBODY} bg-white`}>
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                cost={costs?.[p.id]}
                quantity={stock?.[p.id] ?? null}
                groupName={p.groupId ? (groupNames.get(p.groupId) ?? null) : null}
                canDelete={props.canDelete}
                selected={selectedIds.has(p.id)}
                isGuest={isGuest ?? false}
                {...(onSaveCost ? { onSaveCost } : {})}
                onToggle={props.onToggleOne}
                onEdit={props.onEdit}
                onToggleActive={props.onToggleActive}
                onDelete={props.onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
