import { useState } from 'react';
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
  const [showAllCardsMobile, setShowAllCardsMobile] = useState(false);
  const totals = page.profitTotals;
  const avgMargin = marginPercent(totals.profit, totals.revenue);

  const cards = [
    { label: 'Toplam Ciro', value: formatMoney(totals.revenue), cls: 'bg-white border-slate-200/80 text-slate-900' },
    { label: 'Toplam Maliyet', value: formatMoney(totals.cost), cls: 'bg-white border-slate-200/80 text-slate-700' },
    { label: 'Net Kâr', value: formatMoney(totals.profit), cls: 'bg-emerald-50/50 border-emerald-200/80 text-emerald-800' },
    {
      label: 'Ortalama Marj',
      value: avgMargin === null ? '—' : `%${avgMargin.toFixed(1)}`,
      cls: 'bg-blue-50/50 border-blue-200/80 text-blue-800',
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
      {/* 📱 MOBİL GÖRÜNÜM: Açılır / Kapanır 4 Kart Akordeonu (md altı ekranlar) */}
      <div className="space-y-3 md:hidden">
        {/* 1. Kart: Toplam Ciro + Tüm Kartları Göster Butonu */}
        <div className="p-4 rounded-2xl border bg-white border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase leading-tight tracking-wider text-slate-500">
              Toplam Ciro
            </span>

            <button
              type="button"
              onClick={() => setShowAllCardsMobile(!showAllCardsMobile)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              aria-label={showAllCardsMobile ? 'Kartları Gizle' : 'Tüm Kartları Göster'}
            >
              <span>{showAllCardsMobile ? 'Özetle' : 'Tüm Kartlar'}</span>
              <svg
                className={`size-3 text-slate-500 transition-transform duration-200 ${
                  showAllCardsMobile ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <p className="text-xl font-black text-slate-900 mt-2 font-mono">
            {formatMoney(totals.revenue)}
          </p>
        </div>

        {/* Butona basıldığında açılan diğer 3 kart */}
        {showAllCardsMobile && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {cards.slice(1).map((card) => (
              <div key={card.label} className={`p-4 rounded-2xl border shadow-xs ${card.cls}`}>
                <p className="text-[11px] font-extrabold uppercase leading-tight tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="text-xl font-black mt-1.5 font-mono">{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 4 Kolonlu Tam Izgara (md ve üzeri ekranlar) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`p-4 rounded-2xl border shadow-xs ${card.cls}`}>
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
