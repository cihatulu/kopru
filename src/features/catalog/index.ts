// features/catalog PUBLIC YÜZEYİ (A20).

export { useProducts, useProductCosts } from './api/useProducts';
export type { CatalogProduct } from './api/useProducts';

export { useSaveProduct, useSetProductActive } from './api/useProductMutations';
export type { SaveProductInput } from './api/useProductMutations';

export { productSchema, marginPercent, discountedPrice } from './domain/productSchema';
export type { ProductForm } from './domain/productSchema';

export { ProductTable } from './components/ProductTable';
export { ProductDialog } from './components/ProductDialog';
export { CatalogRow } from './components/CatalogRow';
