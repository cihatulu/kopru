import type { ProductGroup } from '../api/useProductGroups';

interface Props {
  selectedCount: number;
  /** Seçilenlerden KAÇI tek ürün — set yalnız tek ürünlerden kurulur. */
  selectedSingleCount: number;
  productCount: number;
  setCount: number;
  groups: ProductGroup[];
  onAssignGroup: () => void;
  onManageGroups: () => void;
  onCreateSet: () => void;
  onAddProduct: () => void;
}

/**
 * Başlık aksiyonları.
 *
 * furniture-platform'da butonlarda plan limitleri yazıyordu ("Ürün Ekle 2/30").
 * KÖPRÜ'de plan gating kaldırıldığı için sayaç var ama ÜST SINIR YOK — sahte
 * bir limit koymak, kullanıcıyı olmayan bir kurala çarptırırdı.
 */
export function ProductHeaderActions({
  selectedCount,
  selectedSingleCount,
  productCount,
  setCount,
  groups,
  onAssignGroup,
  onManageGroups,
  onCreateSet,
  onAddProduct,
}: Props) {
  // Set en az iki TEK üründen kurulur; setin içine set koymak sonsuz döngüdür.
  const canCreateSet = selectedSingleCount >= 2;

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center xl:w-auto">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAssignGroup}
          disabled={selectedCount === 0}
          title={selectedCount === 0 ? 'Önce tablodan ürün seçin' : undefined}
          className="h-11 flex-1 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:flex-none"
        >
          Gruba Ekle ({selectedCount})
        </button>
        <button
          type="button"
          onClick={onManageGroups}
          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 sm:flex-none"
        >
          Grupları Yönet{groups.length > 0 ? ` (${groups.length})` : ''}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCreateSet}
          disabled={!canCreateSet}
          title={canCreateSet ? undefined : 'Takım oluşturmak için en az 2 tek ürün seçin'}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:flex-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
          </svg>
          Set Oluştur ({setCount})
        </button>
        <button
          type="button"
          onClick={onAddProduct}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 sm:flex-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Ürün Ekle ({productCount})
        </button>
      </div>
    </div>
  );
}
