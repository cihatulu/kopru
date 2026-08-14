import { CatalogGrid } from '@/features/catalog';
import { useAuthSession } from '@/features/auth';

/** Ürün Kataloğum — vitrin görünümü. YALNIZ KOMPOZİSYON (A20). */
export default function ManufacturerCatalogPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  if (!orgId) return null;

  return (
    <div className="space-y-6">
      {/* Başlık bloğu perakendeci kataloğuyla aynı ölçüde: iki ekran aynı ailedendir. */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Ürün Kataloğum</h1>
        <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
          Ürünlerinizi gruplar altında inceleyin. Soldaki ağaçtan bir gruba veya ürüne tıklayarak
          listeyi daraltabilirsiniz. Düzenleme Ürün Yönetimi ekranında yapılır.
        </p>
      </div>

      <CatalogGrid ownerOrgId={orgId} />
    </div>
  );
}
