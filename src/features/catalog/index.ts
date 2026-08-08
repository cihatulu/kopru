// features/catalog PUBLIC YÜZEYİ (A20).

export { useProducts, useProductCosts } from './api/useProducts';
export type { CatalogProduct } from './api/useProducts';

export { useSaveProduct, useSetProductActive } from './api/useProductMutations';
export type { SaveProductInput } from './api/useProductMutations';

export {
  useProductGroups,
  useSaveProductGroup,
  useDeleteProductGroup,
} from './api/useProductGroups';
export type { ProductGroup } from './api/useProductGroups';

export { useProductStock } from './api/useProductStock';
export { useAssignProductsToGroup, useAssignToNewGroup, useSetGroupProducts } from './api/useGroupMembership';
export { useCatalogAdmin } from './api/useCatalogAdmin';

export { useCatalogTree } from './api/useCatalogTree';
export type { TreeGroup, TreeProduct } from './api/useCatalogTree';

export { productSchema, marginPercent, discountedPrice } from './domain/productSchema';
export type { ProductForm } from './domain/productSchema';

export { cleanVariants, formatDimensions } from './domain/variants';
export type { Variant, SetLine, Dimensions } from './domain/variants';

export { toSavePayload, optionalNumber } from './domain/submitMapping';

export {
  CRITICAL_STOCK,
  MARGIN_LABEL,
  compactMoney,
  computeStats,
  marginBand,
  matchesStockFilter,
  netProfit,
  stockLevel,
} from './domain/productStats';
export type { ProductStats, StockFilter, MarginBand, StockLevel } from './domain/productStats';

export {
  canBuildSet,
  clampQuantity,
  describeSet,
  suggestedCost,
  suggestedPrice,
} from './domain/setBuilder';
export type { SetLineInput } from './domain/setBuilder';

export { ProductTable } from './components/ProductTable';
export { ProductDialog } from './components/ProductDialog';
export type { ProductSubmit } from './components/ProductDialog';
export { CatalogRow } from './components/CatalogRow';
export { GroupManager } from './components/GroupManager';
export { ProductToolbar } from './components/ProductToolbar';
export { CatalogTree } from './components/CatalogTree';
export { CatalogGrid } from './components/CatalogGrid';
export { ProductCard } from './components/ProductCard';
export { ProductPreview } from './components/ProductPreview';
export { ProductManager } from './components/ProductManager';
export { ProductStatCards } from './components/ProductStatCards';
export { ProductFilterBar } from './components/ProductFilterBar';
export { ProductRow } from './components/ProductRow';
export { SetBuilderDialog } from './components/SetBuilderDialog';
export type { SetSubmit } from './components/SetBuilderDialog';
export { GroupAssignDialog } from './components/GroupAssignDialog';
export { GroupManagerDialog } from './components/GroupManagerDialog';
export { DeleteProductDialog } from './components/DeleteProductDialog';
