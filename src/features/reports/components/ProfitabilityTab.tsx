import { formatMoney } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { ProfitabilityFilters } from './ProfitabilityFilters';
import { ProfitabilityTable } from './ProfitabilityTable';
import { marginPercent } from '../domain/profitability';
import type { useReportsPage } from '../api/useReportsPage';

const CSV_HEADERS = [
  'Ürün Adı',
  'Kategori',
  'Perakendeci',
  'Satılan Adet',
  'Toplam Maliyet',
  'Toplam Ciro',
  'Net Kâr',
  'Kâr Marjı (%)',
];

export function ProfitabilityTab({ page }: { page: ReturnType<typeof useReportsPage> }) {
  const totals = page.profitTotals;
  const avgMargin = marginPercent(totals.profit, totals.revenue);

  const cards = [
    { label: 'Toplam Ciro', value: formatMoney(totals.revenue), cls: 'bg-white border-slate-100 text-slate-850' },
    { label: 'Toplam Maliyet', value: formatMoney(totals.cost), cls: 'bg-white border-slate-100 text-slate-600' },
    { label: 'Net Kâr', value: formatMoney(totals.profit), cls: 'bg-emerald-50/40 border-emerald-100 text-emerald-800' },
    {
      label: 'Ortalama Marj',
      value: avgMargin === null ? '—' : `%${avgMargin.toFixed(1)}`,
      cls: 'bg-blue-50/40 border-blue-100 text-blue-800',
    },
  ];

  const exportCsv = () => {
    const rows = page.profitRows.map((item) => {
      const margin = marginPercent(item.totalProfit, item.totalRevenue);
      return [
        item.product.name,
        item.product.category || '-',
        item.retailerName,
        item.totalQty,
        item.totalCost,
        item.totalRevenue,
        item.totalProfit,
        margin === null ? '0' : margin.toFixed(2),
      ];
    });
    downloadCSV(CSV_HEADERS, rows, 'karlilik_analizi.csv');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`p-4 rounded-2xl border shadow-sm ${card.cls}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              {card.label}
            </p>
            <p className="text-lg font-black mt-1.5">{card.value}</p>
          </div>
        ))}
      </div>

      <ProfitabilityFilters
        filters={page.filters}
        categories={page.categories}
        retailers={page.retailers}
        onChange={page.setFilters}
        onReset={page.resetFilters}
        onExport={exportCsv}
      />

      <ProfitabilityTable rows={page.profitRows} />
    </div>
  );
}
