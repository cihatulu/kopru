import { useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { formatMoney } from '@/lib/format';
import { netProfit } from '../domain/productStats';
import { marginPercent } from '../domain/productSchema';
import type { CatalogProduct } from '../api/useProducts';
import { PriceRequestModal } from './PriceRequestModal';
import {
  MarginCell,
  ModelCell,
  ProductIdentityCell,
  ProfitCell,
  SelectCell,
  StockCell,
} from './ProductRowCells';

interface Props {
  product: CatalogProduct;
  /** Yalnız üretici görünümünde dolu gelir; perakendecide RLS boş döndürür (A4). */
  cost: number | undefined;
  quantity: number | null;
  groupName: string | null;
  /** Kalıcı silme yalnız SAHİPTE ve yalnız pasif üründe görünür. */
  canDelete: boolean;
  selected: boolean;
  isGuest?: boolean;
  onSaveCost?: (productId: string, costPrice: number) => void;
  onToggle: (id: string) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
}

export function ProductRow({
  product: p,
  cost,
  quantity,
  groupName,
  canDelete,
  selected,
  isGuest = false,
  onSaveCost,
  onToggle,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const [showPriceModal, setShowPriceModal] = useState(false);

  const margin = marginPercent(p.supplierPrice, cost);
  const profit = netProfit(p.supplierPrice, cost);

  return (
    <>
      <tr className={`transition-colors hover:bg-slate-50/45 ${selected ? 'bg-brand-50' : ''}`}>
        <SelectCell product={p} selected={selected} onToggle={onToggle} />

        <ProductIdentityCell product={p} />

        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
          {groupName ?? '—'}
        </td>

        <ModelCell code={p.code} />

        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{p.category ?? '—'}</td>

        <StockCell quantity={quantity} />

        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
          {isGuest ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400">₺</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Maliyet"
                key={`${p.id}-${cost ?? ''}`}
                defaultValue={cost ?? ''}
                onBlur={(e) => {
                  const val = Number(e.target.value.replace(',', '.'));
                  if (!isNaN(val) && val >= 0 && val !== cost && onSaveCost) {
                    onSaveCost(p.id, val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                placeholder="0,00"
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
          ) : cost === undefined ? (
            '—'
          ) : (
            formatMoney(cost)
          )}
        </td>

        <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-slate-800">
          {isGuest ? (
            <button
              type="button"
              onClick={() => setShowPriceModal(true)}
              className="group flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-left transition-all hover:border-slate-200 hover:bg-slate-100"
              title="Fiyat değişiklik talebi oluştur (Perakendeci onayına tabidir)"
            >
              <span>{formatMoney(p.supplierPrice)}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="size-3.5 text-slate-400 transition-colors group-hover:text-brand-600"
              >
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          ) : (
            formatMoney(p.supplierPrice)
          )}
        </td>

        <ProfitCell profit={profit} />
        <MarginCell margin={margin} />

        <td className="whitespace-nowrap px-3 py-3 text-center">
          {isGuest ? (
            <span className="text-xs font-medium text-slate-400">—</span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <IconButton label="Düzenle" onClick={() => onEdit(p)}>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </IconButton>
              {p.isActive ? (
                <IconButton label="Pasife al" onClick={() => onToggleActive(p)}>
                  <path d="M18.36 6.64A9 9 0 1112 3v9" />
                </IconButton>
              ) : (
                <IconButton label="Aktife al" onClick={() => onToggleActive(p)}>
                  <path d="M20 6L9 17l-5-5" />
                </IconButton>
              )}
              {!p.isActive && canDelete && (
                <IconButton label="Kalıcı olarak sil" danger onClick={() => onDelete(p)}>
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </IconButton>
              )}
            </div>
          )}
        </td>
      </tr>
      {showPriceModal && <PriceRequestModal product={p} onClose={() => setShowPriceModal(false)} />}
    </>
  );
}
