import { useState } from 'react';
import {
  ProfitabilityTab,
  ReportDetailModal,
  ReportOverview,
  RetailerPeriodReport,
  useReportsPage,
  type ReportKind,
} from '@/features/reports';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

const TAB_BTN = 'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer';

/** Raporlar — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function ReportsPage() {
  const { data: user } = useAuthSession();
  const isManufacturer = user?.org?.kind === ORG_KIND.manufacturer;

  const page = useReportsPage(user?.org?.id, isManufacturer);
  const [openReport, setOpenReport] = useState<ReportKind | null>(null);

  if (!user?.org) return null;

  if (!isManufacturer) return <RetailerPeriodReport />;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Performans Raporları</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Ürün satışı, bayi bazlı performans ve karlılık oranlarını izleyin.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
          {(['overview', 'profitability'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => page.setTab(tab)}
              className={`${TAB_BTN} ${
                page.tab === tab
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'overview' ? 'Genel Özet' : 'Karlılık Analizi'}
            </button>
          ))}
        </div>
      </div>

      {page.query.isPending && (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      )}

      {page.query.isError && (
        <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-bold border border-red-100 shadow-xs">
          ❌ Rapor verileri yüklenirken bir hata oluştu.
        </p>
      )}

      {page.query.isSuccess && page.tab === 'overview' && (
        <ReportOverview page={page} onOpenReport={setOpenReport} />
      )}

      {page.query.isSuccess && page.tab === 'profitability' && <ProfitabilityTab page={page} />}

      {openReport && page.query.isSuccess && (
        <ReportDetailModal
          kind={openReport}
          categories={page.categories}
          sources={{
            customers: page.customers,
            products: page.products,
            ssh: page.ssh,
            cancelled: page.cancelled,
            returned: page.returned,
          }}
          onClose={() => setOpenReport(null)}
        />
      )}
    </div>
  );
}
