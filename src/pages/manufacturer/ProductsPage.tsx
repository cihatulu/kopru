import { ProductManager } from '@/features/catalog';
import { useAuthSession } from '@/features/auth';

/** Ürün Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function ProductsPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  if (!orgId) return null;

  return <ProductManager orgId={orgId} />;
}
