import { useState } from 'react';
import { useCounterparties, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { RetailerProductManager } from '@/features/catalog/components/RetailerProductManager';
import { Spinner } from '@/components/ui/Spinner';

export default function ProductManagementPage() {
  const { data: user } = useAuthSession();

  const suppliers = useCounterparties();
  const edges: Edge[] = (suppliers.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const selected = edges.find((e) => e.id === supplierId) ?? edges[0];

  if (!user?.org) return null;

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Üretici Seçimi Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Ürün Yönetimi</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Tedarikçilerinize ait ürün kataloglarını ve perakende satış fiyatlarınızı yönetin.
          </p>
        </div>

        {edges.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <label htmlFor="manufacturer-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2 shrink-0">
              Üretici Seçin:
            </label>
            <select
              id="manufacturer-select"
              value={selected?.id ?? ''}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full sm:w-64 cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {edges.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.manufacturer.companyName} {!e.manufacturer.isSubscriber ? '(Misafir)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {suppliers.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : edges.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-600">Aktif tedarikçiniz bulunmuyor.</p>
          <p className="mt-1 text-xs text-slate-400">
            Tedarikçilerim sayfasından yeni tedarikçi ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        selected && (
          <RetailerProductManager
            manufacturerId={selected.manufacturerOrgId}
            isGuest={!selected.manufacturer.isSubscriber}
            canEditCatalog={selected.canEditCatalog}
          />
        )
      )}
    </div>
  );
}
