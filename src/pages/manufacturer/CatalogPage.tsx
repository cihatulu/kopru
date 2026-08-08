import { CatalogGrid } from '@/features/catalog';
import { useAuthSession } from '@/features/auth';

/** Ürün Kataloğum — vitrin görünümü. YALNIZ KOMPOZİSYON (A20). */
export default function ManufacturerCatalogPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  if (!orgId) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Ürün Kataloğum</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Ürünlerinizi gruplar altında inceleyin. Soldaki ağaçtan bir gruba veya ürüne
          tıklayarak listeyi daraltabilirsiniz. Düzenleme Ürün Yönetimi ekranında yapılır.
        </p>
      </div>

      <CatalogGrid ownerOrgId={orgId} />
    </div>
  );
}
