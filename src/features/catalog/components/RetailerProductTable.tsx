import { useState } from 'react';
import { TBODY, THEAD, TableEmpty } from '@/components/ui/Table';
import { formatMoney } from '@/lib/format';
import { netProfit } from '../domain/productStats';
import { marginPercent } from '../domain/productSchema';
import { RetailerProductRow } from './RetailerProductRow';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  products: CatalogProduct[];
  stock: Record<string, number> | undefined;
  retailPrices: Record<string, number> | undefined;
  groupNames: Map<string, string>;
  canDelete: boolean;
  canEdit: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], selectAll: boolean) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
  onUpdateRetailPrice: (productId: string, price: number) => void;
}

const TH_L = 'px-2.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TH_R = 'px-2.5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TH_C = 'px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';

/** Perakendeci Ürün Tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function RetailerProductTable(props: Props) {
  const { products, stock, retailPrices, groupNames, selectedIds } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {products.length === 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
            Aradığınız kriterlere uygun ürün bulunamadı.
          </div>
        )}

        {products.map((p) => {
          const isSelected = selectedIds.has(p.id);
          const qty = stock?.[p.id] ?? null;
          const retailPrice = retailPrices?.[p.id];
          const groupName = p.groupId ? (groupNames.get(p.groupId) ?? null) : null;
          const profit = netProfit(retailPrice ?? 0, p.supplierPrice);
          const margin = marginPercent(retailPrice ?? 0, p.supplierPrice);
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
                  {props.canEdit && (
                    <input
                      type="checkbox"
                      aria-label={`${p.name} seç`}
                      checked={isSelected}
                      onChange={() => props.onToggleOne(p.id)}
                      className="size-4 mt-1 cursor-pointer rounded border-slate-300 text-slate-900 shrink-0"
                    />
                  )}

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

                {/* Sağ Üst Aksiyon Butonları */}
                {props.canEdit && (
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => props.onEdit(p)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs w-full"
                    >
                      <svg className="size-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() => props.onToggleActive(p)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors shadow-2xs w-full ${
                        p.isActive
                          ? 'border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {p.isActive ? 'Pasife Al' : 'Aktife Al'}
                    </button>

                    {props.canDelete && !p.isActive && (
                      <button
                        type="button"
                        onClick={() => props.onDelete(p)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shadow-2xs w-full"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Kart Gövdesi: Finansal ve Stok Izgarası */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                {/* Sol: Stok Durumu */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stok Durumu
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${
                      qty === null
                        ? 'bg-slate-100 text-slate-600'
                        : qty <= 0
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : qty <= 3
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {qty === null ? '—' : `${qty} Adet`}
                  </span>
                </div>

                {/* Sağ: Alış Maliyeti */}
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Alış Maliyeti
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-1 font-mono">
                    {formatMoney(p.supplierPrice)}
                  </span>
                </div>

                {/* Sol Alt: Satış Fiyatınız (Düzenlenebilir) */}
                <div className="pt-2 border-t border-slate-100 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Satış Fiyatınız
                    </span>
                    <RetailPriceMobileCell
                      productId={p.id}
                      retailPrice={retailPrice}
                      onSave={props.onUpdateRetailPrice}
                    />
                  </div>

                  {/* Sağ Alt: Net Kâr & Marj */}
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Net Kâr & Marj
                    </span>
                    <div className="mt-0.5">
                      <span
                        className={`font-black font-mono text-sm ${
                          profit === null
                            ? 'text-slate-400'
                            : profit > 0
                            ? 'text-emerald-700'
                            : profit < 0
                            ? 'text-red-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {profit === null ? '—' : formatMoney(profit)}
                      </span>
                      {margin !== null && (
                        <span
                          className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            margin > 30
                              ? 'bg-emerald-50 text-emerald-700'
                              : margin > 15
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          %{margin.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className={THEAD}>
            <tr>
              {props.canEdit && (
                <th className="w-8 px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label="Tümünü seç"
                    checked={allSelected}
                    onChange={() => props.onToggleAll(ids, !allSelected)}
                    className="size-3.5 cursor-pointer rounded border-slate-300 text-slate-900"
                  />
                </th>
              )}
              <th className={TH_L}>Ürün Adı</th>
              <th className={TH_L}>Grup</th>
              <th className={TH_L}>Model</th>
              <th className={TH_L}>Kategori</th>
              <th className={TH_C}>Stok</th>
              <th className={TH_R}>Alış Maliyeti</th>
              <th className={TH_R}>Satış Fiyatınız</th>
              <th className={TH_R}>Net Kâr</th>
              <th className={TH_R}>Kâr Marjı</th>
              {props.canEdit && <th className={TH_C}>İşlemler</th>}
            </tr>
          </thead>

          <tbody className={`${TBODY} bg-white divide-y divide-slate-100`}>
            {products.length === 0 && (
              <TableEmpty colSpan={props.canEdit ? 11 : 10}>
                Aradığınız kriterlere uygun ürün bulunamadı.
              </TableEmpty>
            )}

            {products.map((p) => (
              <RetailerProductRow
                key={p.id}
                product={p}
                quantity={stock?.[p.id] ?? null}
                retailPrice={retailPrices?.[p.id]}
                groupName={p.groupId ? (groupNames.get(p.groupId) ?? null) : null}
                canDelete={props.canDelete}
                canEdit={props.canEdit}
                selected={selectedIds.has(p.id)}
                onToggle={props.onToggleOne}
                onEdit={props.onEdit}
                onToggleActive={props.onToggleActive}
                onDelete={props.onDelete}
                onUpdateRetailPrice={props.onUpdateRetailPrice}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Mobilde Satış Fiyatı Giriş / Düzenleme Hücresi */
function RetailPriceMobileCell({
  productId,
  retailPrice,
  onSave,
}: {
  productId: string;
  retailPrice: number | undefined;
  onSave: (productId: string, price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(retailPrice?.toString() ?? '');

  const cancel = () => {
    setEditing(false);
    setDraft(retailPrice?.toString() ?? '');
  };

  const save = () => {
    const value = parseFloat(draft.replace(',', '.'));
    if (!isNaN(value) && value >= 0) onSave(productId, value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <input
          type="text"
          inputMode="decimal"
          aria-label="Perakende satış fiyatı"
          className="w-24 rounded-lg border border-slate-300 px-2 py-0.5 text-xs text-slate-900 focus:border-brand-500 focus:ring-brand-500 font-mono font-bold"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          autoFocus
        />
        <button
          type="button"
          aria-label="Kaydet"
          onClick={save}
          className="p-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Vazgeç"
          onClick={cancel}
          className="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg border border-slate-200"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(retailPrice?.toString() ?? '');
        setEditing(true);
      }}
      className="group flex items-center gap-1.5 mt-0.5 text-xs font-black text-brand-600 hover:text-brand-700 font-mono cursor-pointer"
    >
      <span>{retailPrice === undefined ? 'Fiyat Belirle' : formatMoney(retailPrice)}</span>
      <svg className="size-3 text-slate-400 group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}
