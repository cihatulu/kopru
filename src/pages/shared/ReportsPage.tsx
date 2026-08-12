import React, { useState, useMemo } from 'react';
import {
  StatCard,
  averageOrder,
  manufacturerMargin,
  retailerProfit,
  useSummaryFor,
  useManufacturerReports,
} from '@/features/reports';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/format';
import { ORG_KIND } from '@/constants';

// --- Icons ---
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const FurnitureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 text-slate-400 p-2 border">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// CSV Export Helper
const downloadCSV = (headers: string[], rows: (string | number)[][], fileName: string) => {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ReportsPage() {
  const { data: user } = useAuthSession();
  const isManufacturer = user?.org?.kind === ORG_KIND.manufacturer;

  // Summaries (original summary widgets)
  const { manufacturer, retailer } = useSummaryFor(user?.org?.kind);

  // Detailed reports data for manufacturer
  const detailedQuery = useManufacturerReports(user?.org?.id, isManufacturer);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'profitability'>('overview');

  // Modal State
  const [activeReport, setActiveReport] = useState<'customers' | 'products' | 'ssh' | 'cancelled_products' | 'returned_products' | null>(null);

  // Profitability Filters
  const [profitSearch, setProfitSearch] = useState('');
  const [profitCategory, setProfitCategory] = useState('');
  const [profitRetailer, setProfitRetailer] = useState('');

  // ---------------------------------------------------- DATA CALCULATIONS
  const data = detailedQuery.data;

  // 1. Top buying customers
  const customerData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, { retailerName: string; totalAmount: number; orderCount: number }>();

    data.orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .forEach((order) => {
        const current = stats.get(order.retailerOrgId) || {
          retailerName: order.retailerName,
          totalAmount: 0,
          orderCount: 0,
        };
        stats.set(order.retailerOrgId, {
          retailerName: order.retailerName,
          totalAmount: current.totalAmount + order.totalAmount,
          orderCount: current.orderCount + 1,
        });
      });

    return Array.from(stats.entries())
      .map(([id, s]) => ({ id, companyName: s.retailerName, totalAmount: s.totalAmount, orderCount: s.orderCount }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [data]);

  // 2. Top selling products
  const productData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, { quantity: number; revenue: number; profit: number }>();

    data.orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .forEach((order) => {
        order.items.forEach((item) => {
          if (!item.productId) return;
          const current = stats.get(item.productId) || { quantity: 0, revenue: 0, profit: 0 };
          const costPrice = data.costs.get(item.productId) || 0;
          const revenue = item.totalPrice;
          const cost = item.quantity * costPrice;
          const profit = revenue - cost;

          stats.set(item.productId, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + revenue,
            profit: current.profit + profit,
          });
        });
      });

    return Array.from(stats.entries())
      .map(([id, s]) => {
        const prod = data.products.find((p) => p.id === id);
        return {
          id,
          product: prod,
          quantity: s.quantity,
          revenue: s.revenue,
          profit: s.profit,
        };
      })
      .filter((item) => item.product)
      .sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  // 3. SSH & Malfunction Density
  const sshData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, number>();

    data.sshRequests.forEach((req) => {
      if (!req.productId) return;
      stats.set(req.productId, (stats.get(req.productId) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([id, count]) => {
        const prod = data.products.find((p) => p.id === id);
        return {
          id,
          product: prod,
          count,
        };
      })
      .filter((item) => item.product)
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // 4. Most Cancelled Products
  const cancelledProductData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, number>();

    data.orders
      .filter((o) => o.status === 'cancelled')
      .forEach((order) => {
        order.items.forEach((item) => {
          if (!item.productId) return;
          stats.set(item.productId, (stats.get(item.productId) || 0) + item.quantity);
        });
      });

    return Array.from(stats.entries())
      .map(([id, qty]) => {
        const prod = data.products.find((p) => p.id === id);
        return {
          id,
          product: prod,
          quantity: qty,
        };
      })
      .filter((item) => item.product)
      .sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  // 5. Most Returned Products
  const returnedProductData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, number>();

    data.orders
      .filter((o) => o.status === 'returned')
      .forEach((order) => {
        order.items.forEach((item) => {
          if (!item.productId) return;
          stats.set(item.productId, (stats.get(item.productId) || 0) + item.quantity);
        });
      });

    return Array.from(stats.entries())
      .map(([id, qty]) => {
        const prod = data.products.find((p) => p.id === id);
        return {
          id,
          product: prod,
          quantity: qty,
        };
      })
      .filter((item) => item.product)
      .sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  // Categories list
  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.products.map((p) => p.category).filter(Boolean) as string[])];
  }, [data]);

  // Unique Retailers list
  const uniqueRetailers = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.orders.forEach((o) => map.set(o.retailerOrgId, o.retailerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  // Profitability Detailed Table Data
  const profitabilityData = useMemo(() => {
    if (!data) return [];
    const stats = new Map<string, {
      product: typeof data.products[0];
      retailerName: string;
      totalQty: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
    }>();

    data.orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .forEach((order) => {
        if (profitRetailer && order.retailerOrgId !== profitRetailer) return;

        order.items.forEach((item) => {
          if (!item.productId) return;
          const prod = data.products.find((p) => p.id === item.productId);
          if (!prod) return;

          if (profitSearch && !prod.name.toLowerCase().includes(profitSearch.toLowerCase()) && !prod.code.toLowerCase().includes(profitSearch.toLowerCase())) return;
          if (profitCategory && prod.category !== profitCategory) return;

          const key = `${item.productId}_${order.retailerOrgId}`;
          const current = stats.get(key) || {
            product: prod,
            retailerName: order.retailerName,
            totalQty: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
          };

          const costPrice = data.costs.get(item.productId) || 0;
          const revenue = item.totalPrice;
          const cost = item.quantity * costPrice;
          const profit = revenue - cost;

          stats.set(key, {
            product: prod,
            retailerName: order.retailerName,
            totalQty: current.totalQty + item.quantity,
            totalRevenue: current.totalRevenue + revenue,
            totalCost: current.totalCost + cost,
            totalProfit: current.totalProfit + profit,
          });
        });
      });

    return Array.from(stats.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [data, profitSearch, profitCategory, profitRetailer]);

  // Profitability totals
  const profitTotals = useMemo(() => {
    return profitabilityData.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.totalRevenue,
        cost: acc.cost + item.totalCost,
        profit: acc.profit + item.totalProfit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [profitabilityData]);

  // ---- KPI SUMMARY (Genel Özet üstü) ----
  const kpiSummary = useMemo(() => {
    if (!data) return { totalOrders: 0, totalRevenue: 0, netProfit: 0, activeRetailers: 0 };
    const validOrders = data.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const netProfit = validOrders.reduce((sum, order) => {
      return sum + order.items.reduce((s, item) => {
        if (!item.productId) return s;
        const cost = data.costs.get(item.productId) || 0;
        return s + (item.totalPrice - item.quantity * cost);
      }, 0);
    }, 0);
    const activeRetailers = new Set(validOrders.map((o) => o.retailerOrgId)).size;
    return { totalOrders: validOrders.length, totalRevenue, netProfit, activeRetailers };
  }, [data]);

  // ---- MONTHLY REVENUE CHART (son 6 ay) ----
  const monthlyRevenue = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const months: { key: string; label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('tr-TR', { month: 'short' });
      months.push({ key, label, revenue: 0 });
    }
    data.orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .forEach((order) => {
        const d = new Date(order.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const month = months.find((m) => m.key === key);
        if (month) month.revenue += order.totalAmount;
      });
    return months;
  }, [data]);

  const handleDownloadProfitability = () => {
    const headers = ['Ürün Adı', 'Kategori', 'Perakendeci', 'Satılan Adet', 'Toplam Maliyet', 'Toplam Ciro', 'Net Kâr', 'Kâr Marjı (%)'];
    const rows = profitabilityData.map((item) => [
      item.product.name,
      item.product.category || '-',
      item.retailerName,
      item.totalQty,
      item.totalCost,
      item.totalRevenue,
      item.totalProfit,
      item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(2) : '0',
    ]);
    downloadCSV(headers, rows, 'karlilik_analizi.csv');
  };

  if (!user?.org) return null;

  // If Retailer, keep the original simple cards overview
  if (!isManufacturer) {
    return (
      <div className="space-y-5 text-left">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Raporlar</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Son 30 gün. İptal ve iade edilen siparişler hariç tutulur. Beklenen ciro ve kâr yalnız size görünür.
          </p>
        </div>

        {retailer.isPending ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : retailer.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sipariş" value={String(retailer.data.orderCount)} />
            <StatCard label="Alım tutarı" value={formatMoney(retailer.data.purchaseTotal)} />
            <StatCard
              label="Beklenen kâr"
              value={retailerProfit(retailer.data.purchaseTotal, retailer.data.expectedRevenue).percent === null ? '—' : formatMoney(retailerProfit(retailer.data.purchaseTotal, retailer.data.expectedRevenue).profit)}
              tone={retailerProfit(retailer.data.purchaseTotal, retailer.data.expectedRevenue).percent === null ? 'muted' : 'positive'}
              hint={
                retailerProfit(retailer.data.purchaseTotal, retailer.data.expectedRevenue).percent === null
                  ? 'Sepette satış fiyatı girerseniz hesaplanır'
                  : `Kâr oranı %${retailerProfit(retailer.data.purchaseTotal, retailer.data.expectedRevenue).percent}`
              }
            />
            <StatCard
              label="Ortalama sipariş"
              value={formatMoney(averageOrder(retailer.data.purchaseTotal, retailer.data.orderCount))}
              hint={`${retailer.data.supplierCount} tedarikçi`}
            />
          </div>
        ) : null}
      </div>
    );
  }

  // ---------------------------------------------------- MANUFACTURER DASHBOARD VIEW
  return (
    <div className="space-y-6 font-sans text-slate-800 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performans Raporları</h1>
          <p className="text-slate-500 text-xs mt-1">Ürün satışı, bayi bazlı performans ve karlılık oranlarını izleyin.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Genel Özet
          </button>
          <button
            onClick={() => setActiveTab('profitability')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'profitability' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Karlılık Analizi
          </button>
        </div>
      </div>

      {detailedQuery.isPending && (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      )}

      {detailedQuery.isError && (
        <div role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs font-bold border border-rose-100 shadow-sm">
          ❌ Rapor verileri yüklenirken bir hata oluştu.
        </div>
      )}

      {/* --- OVERVIEW TAB --- */}
      {detailedQuery.isSuccess && activeTab === 'overview' && (
        <div className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Toplam Sipariş',
                value: String(kpiSummary.totalOrders),
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100',
              },
              {
                label: 'Toplam Ciro',
                value: formatMoney(kpiSummary.totalRevenue),
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                color: 'text-slate-700',
                bg: 'bg-slate-50',
                border: 'border-slate-100',
              },
              {
                label: 'Net Kâr',
                value: formatMoney(kpiSummary.netProfit),
                icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
              },
              {
                label: 'Aktif Bayi',
                value: String(kpiSummary.activeRetailers),
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
                color: 'text-violet-600',
                bg: 'bg-violet-50',
                border: 'border-violet-100',
              },
            ].map((card) => (
              <div key={card.label} className={`p-4 rounded-2xl border ${card.border} ${card.bg} flex items-center gap-3.5 shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border ${card.border} shadow-sm`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${card.color}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</p>
                  <p className={`text-lg font-black mt-0.5 ${card.color}`}>{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Revenue Chart */}
          {monthlyRevenue.some((m) => m.revenue > 0) && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800">Aylık Ciro Grafiği</h2>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Son 6 ay</span>
              </div>
              <MonthlyBarChart months={monthlyRevenue} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customers Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-blue-500"></div>
                  <h2 className="text-sm font-bold text-slate-800">En Çok Satın Alan Müşteriler</h2>
                </div>
                <button
                  onClick={() => setActiveReport('customers')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                >
                  Tümünü Gör
                </button>
              </div>
              <div className="flex-1 space-y-3.5">
                {customerData.slice(0, 3).length > 0 ? (
                  customerData.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${index === 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.companyName}</p>
                        </div>
                      </div>
                      <p className="font-extrabold text-slate-900 text-sm">{formatMoney(item.totalAmount)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic py-4 text-center">Yeterli veri bulunamadı.</p>
                )}
              </div>
            </div>

            {/* Products Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-amber-500"></div>
                  <h2 className="text-sm font-bold text-slate-800">En Çok Satan Ürünler</h2>
                </div>
                <button
                  onClick={() => setActiveReport('products')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                >
                  Detaylı Rapor
                </button>
              </div>
              <div className="flex-1 space-y-3.5">
                {productData.slice(0, 3).length > 0 ? (
                  productData.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${index === 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-550'}`}>
                          {index + 1}
                        </div>
                        {item.product?.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border" />
                        ) : (
                          <FurnitureIcon />
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.product?.name}</p>
                          <p className="text-xs text-slate-450 mt-0.5">{item.product?.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-900 text-sm">{item.quantity} Adet</p>
                        <p className="text-[10px] text-emerald-600 font-black mt-0.5">Kâr: {formatMoney(item.profit)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic py-4 text-center">Yeterli veri bulunamadı.</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: SSH + Cancellations/Returns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SSH Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-rose-500"></div>
                  <h2 className="text-sm font-bold text-slate-800">SSH & Arıza Yoğunluk Analizi</h2>
                </div>
                <button
                  onClick={() => setActiveReport('ssh')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                >
                  Tümünü Gör
                </button>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl mb-4 flex items-start gap-2.5">
                <InfoIcon />
                <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                  Bu liste, açılan SSH taleplerinde <strong className="font-extrabold text-amber-900">seçilen</strong> ürünlerin arıza sıklığını gösterir.
                </p>
              </div>

              <div className="space-y-3.5 flex-1">
                {sshData.slice(0, 3).length > 0 ? (
                  sshData.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {item.product?.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border" />
                        ) : (
                          <FurnitureIcon />
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.product?.name}</p>
                          <p className="text-xs text-slate-450 mt-0.5">{item.product?.category || 'Kategorisiz'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Tavsiye</span>
                          <span className={`text-[10px] font-extrabold ${item.count > 2 ? 'text-rose-600' : 'text-slate-450'}`}>
                            {item.count > 2 ? 'Kontrol Edin' : 'Normal Limit'}
                          </span>
                        </div>
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${item.count > 2 ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-slate-100 text-slate-550'}`}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">Henüz SSH verisi oluşmadı.</p>
                )}
              </div>
            </div>

            {/* Cancellations & Returns */}
            <div className="flex flex-col gap-6">
              {/* Cancelled Products */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-slate-400"></div>
                    <h2 className="text-sm font-bold text-slate-800">En Çok İptal Edilen Ürünler</h2>
                  </div>
                  <button
                    onClick={() => setActiveReport('cancelled_products')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
                  >
                    Tümünü Gör
                  </button>
                </div>

                <div className="space-y-3 flex-1">
                  {cancelledProductData.slice(0, 2).length > 0 ? (
                    cancelledProductData.slice(0, 2).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${index === 0 ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-slate-100 text-slate-550'}`}>
                            {index + 1}
                          </div>
                          {item.product?.images && item.product.images.length > 0 ? (
                            <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border" />
                          ) : (
                            <FurnitureIcon />
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.product?.name}</p>
                            <p className="text-xs text-slate-450 mt-0.5">{item.product?.code}</p>
                          </div>
                        </div>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap">{item.quantity} Adet İptal</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-450 text-xs italic py-6 text-center">İptal sipariş kaydı oluşmadı.</p>
                  )}
                </div>
              </div>

              {/* Returned Products */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-rose-400"></div>
                    <h2 className="text-sm font-bold text-slate-800">En Çok İade Edilen Ürünler</h2>
                  </div>
                  <button
                    onClick={() => setActiveReport('returned_products')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
                  >
                    Tümünü Gör
                  </button>
                </div>

                <div className="space-y-3 flex-1">
                  {returnedProductData.slice(0, 2).length > 0 ? (
                    returnedProductData.slice(0, 2).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${index === 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-555'}`}>
                            {index + 1}
                          </div>
                          {item.product?.images && item.product.images.length > 0 ? (
                            <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border" />
                          ) : (
                            <FurnitureIcon />
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.product?.name}</p>
                            <p className="text-xs text-slate-450 mt-0.5">{item.product?.code}</p>
                          </div>
                        </div>
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap">{item.quantity} Adet İade</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-450 text-xs italic py-6 text-center">İade edilen ürün kaydı bulunmuyor.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFITABILITY TAB --- */}
      {detailedQuery.isSuccess && activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Toplam Ciro', value: formatMoney(profitTotals.revenue), cls: 'bg-white border-slate-100 text-slate-850' },
              { label: 'Toplam Maliyet', value: formatMoney(profitTotals.cost), cls: 'bg-white border-slate-100 text-slate-600' },
              { label: 'Net Kâr', value: formatMoney(profitTotals.profit), cls: 'bg-emerald-50/40 border-emerald-100 text-emerald-800' },
              { label: 'Ortalama Marj', value: `%${profitTotals.revenue > 0 ? ((profitTotals.profit / profitTotals.revenue) * 100).toFixed(1) : 0}`, cls: 'bg-blue-50/40 border-blue-100 text-blue-800' },
            ].map((card, i) => (
              <div key={i} className={`p-4 rounded-2xl border shadow-sm ${card.cls}`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{card.label}</p>
                <p className="text-lg font-black mt-1.5">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-3.5 items-end">
            <div className="w-full lg:flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Ürün Ara</label>
              <input
                type="text"
                placeholder="Ürün adı veya kodu ile ara..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                value={profitSearch}
                onChange={(e) => setProfitSearch(e.target.value)}
              />
            </div>
            <div className="w-full lg:w-1/4">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Kategori</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all bg-white"
                value={profitCategory}
                onChange={(e) => setProfitCategory(e.target.value)}
              >
                <option value="">Tümü</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-1/4">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Perakendeci (Bayi)</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all bg-white"
                value={profitRetailer}
                onChange={(e) => setProfitRetailer(e.target.value)}
              >
                <option value="">Tümü</option>
                {uniqueRetailers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setProfitSearch(''); setProfitCategory(''); setProfitRetailer(''); }}
              className="w-full lg:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex-shrink-0"
            >
              Filtreleri Temizle
            </button>
            <button
              onClick={handleDownloadProfitability}
              className="w-full lg:w-auto px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex-shrink-0 cursor-pointer"
            >
              Excel İndir
            </button>
          </div>

          {/* Detailed Profitability Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-[1000px] lg:min-w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ürün</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kategori</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Perakendeci</th>
                    <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">Satılan</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Toplam Maliyet</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Toplam Ciro</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Net Kâr</th>
                    <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">Marj (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {profitabilityData.length > 0 ? (
                    profitabilityData.map((item, idx) => {
                      const margin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
                      let marginBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (margin > 30) marginBadge = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                      else if (margin > 15) marginBadge = 'bg-amber-50 border-amber-250 text-amber-700';
                      else if (margin <= 0) marginBadge = 'bg-rose-50 border-rose-200 text-rose-700';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-sm">{item.product.name}</div>
                            <div className="text-xs text-slate-450 mt-0.5">{item.product.code}</div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
                            {item.product.category || '—'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600 font-bold">
                            {item.retailerName}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm font-black text-slate-800">
                            {item.totalQty}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-slate-500">
                            {formatMoney(item.totalCost)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-slate-700">
                            {formatMoney(item.totalRevenue)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-extrabold text-emerald-600">
                            {formatMoney(item.totalProfit)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${marginBadge}`}>
                              %{margin.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <p className="text-sm font-medium text-slate-450 italic">Kriterlere uygun satış verisi bulunamadı.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAILED MODALS --- */}
      {activeReport && detailedQuery.isSuccess && (
        <ReportDetailModal
          type={activeReport}
          onClose={() => setActiveReport(null)}
          categories={categories}
          data={
            activeReport === 'customers' ? customerData :
            activeReport === 'products' ? productData :
            activeReport === 'cancelled_products' ? cancelledProductData :
            activeReport === 'returned_products' ? returnedProductData :
            sshData
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------- REPORT DETAIL MODAL COMPONENT
const ReportDetailModal: React.FC<{
  type: 'customers' | 'products' | 'ssh' | 'cancelled_products' | 'returned_products';
  data: any[];
  categories: string[];
  onClose: () => void;
}> = ({ type, data, categories, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter
  const filteredData = useMemo(() => {
    if (!selectedCategory) return data;
    return data.filter((item) => {
      if (item.product && item.product.category === selectedCategory) return true;
      return false;
    });
  }, [data, selectedCategory]);

  // Sort
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (type === 'customers') {
        valA = a.totalAmount;
        valB = b.totalAmount;
      } else if (type === 'products') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (type === 'ssh') {
        valA = a.count;
        valB = b.count;
      } else {
        valA = a.quantity;
        valB = b.quantity;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [filteredData, type, sortOrder]);

  const getTitle = () => {
    switch (type) {
      case 'customers':
        return 'Müşteri Satış Performans Raporu';
      case 'products':
        return 'Ürün Analizi (En Çok Satan Ürünler)';
      case 'ssh':
        return 'Arıza (SSH) Yoğunluk Raporu';
      case 'cancelled_products':
        return 'Ürün İptal Analizi';
      case 'returned_products':
        return 'Ürün İade Analizi';
      default:
        return 'Rapor Detayı';
    }
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let fileName = 'rapor.csv';

    if (type === 'customers') {
      headers = ['Müşteri Adı', 'Sipariş Sayısı', 'Toplam Ciro'];
      rows = sortedData.map((item) => [item.companyName, item.orderCount, item.totalAmount]);
      fileName = 'musteri_satis_raporu.csv';
    } else if (type === 'products') {
      headers = ['Ürün Adı', 'Model', 'Kategori', 'Satılan Adet', 'Ciro', 'Tahmini Kâr'];
      rows = sortedData.map((item) => [
        item.product?.name || '—',
        item.product?.code || '—',
        item.product?.category || '—',
        item.quantity,
        item.revenue,
        item.profit,
      ]);
      fileName = 'urun_satis_karlilik_raporu.csv';
    } else if (type === 'ssh') {
      headers = ['Ürün Adı', 'Kategori', 'Model', 'Arıza Bildirim Sayısı'];
      rows = sortedData.map((item) => [
        item.product?.name || '—',
        item.product?.category || '—',
        item.product?.code || '—',
        item.count,
      ]);
      fileName = 'ssh_ariza_analiz_raporu.csv';
    } else if (type === 'cancelled_products') {
      headers = ['Ürün Adı', 'Model', 'Kategori', 'İptal Edilen Adet'];
      rows = sortedData.map((item) => [
        item.product?.name || '—',
        item.product?.code || '—',
        item.product?.category || '—',
        item.quantity,
      ]);
      fileName = 'urun_iptal_raporu.csv';
    } else if (type === 'returned_products') {
      headers = ['Ürün Adı', 'Model', 'Kategori', 'İade Edilen Adet'];
      rows = sortedData.map((item) => [
        item.product?.name || '—',
        item.product?.code || '—',
        item.product?.category || '—',
        item.quantity,
      ]);
      fileName = 'urun_iade_raporu.csv';
    }

    downloadCSV(headers, rows, fileName);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-655 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between bg-slate-55/30">
          <div className="flex flex-wrap items-center gap-3">
            {type !== 'customers' && (
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Kategori Filtrele</label>
                <select
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Sıralama</label>
              <select
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="desc">Azalan (En yüksek öncelikli)</option>
                <option value="asc">Artan (En düşük öncelikli)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Excel İndir (.csv)
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {type === 'customers' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Müşteri</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-550 uppercase tracking-wider">Sipariş Sayısı</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-550 uppercase tracking-wider">Toplam Ciro</th>
                  </>
                ) : type === 'ssh' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Ürün</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-550 uppercase tracking-wider">SSH Bildirim Adedi</th>
                  </>
                ) : type === 'cancelled_products' || type === 'returned_products' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Ürün</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-550 uppercase tracking-wider">Adet</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Ürün</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-550 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-550 uppercase tracking-wider">Satılan Adet</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-550 uppercase tracking-wider">Toplam Ciro</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-550 uppercase tracking-wider">Tahmini Kâr</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {sortedData.length > 0 ? (
                sortedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {type === 'customers' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{item.companyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-slate-600">{item.orderCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-slate-900">{formatMoney(item.totalAmount)}</td>
                      </>
                    ) : type === 'ssh' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-805">{item.product?.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.product?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{item.product?.category || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-100">{item.count}</span>
                        </td>
                      </>
                    ) : type === 'cancelled_products' || type === 'returned_products' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-805">{item.product?.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.product?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{item.product?.category || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${type === 'cancelled_products' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{item.quantity}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-805">{item.product?.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.product?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{item.product?.category || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center font-extrabold text-slate-800">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-slate-700">{formatMoney(item.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-emerald-600">{formatMoney(item.profit)}</td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Gösterilecek veri bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------- MONTHLY BAR CHART COMPONENT
const MonthlyBarChart: React.FC<{
  months: { key: string; label: string; revenue: number }[];
}> = ({ months }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);
  const chartHeight = 120;
  const barWidth = 36;
  const gap = 12;
  const totalWidth = months.length * (barWidth + gap) - gap;

  const formatK = (n: number) => {
    if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₺${(n / 1_000).toFixed(0)}K`;
    return `₺${n}`;
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        width={totalWidth + 4}
        height={chartHeight + 40}
        viewBox={`0 0 ${totalWidth + 4} ${chartHeight + 40}`}
        className="block mx-auto"
        style={{ minWidth: totalWidth }}
      >
        {months.map((month, i) => {
          const barH = month.revenue > 0 ? Math.max(4, (month.revenue / maxRevenue) * chartHeight) : 4;
          const x = i * (barWidth + gap);
          const y = chartHeight - barH;
          const isHovered = hoveredIdx === i;
          const isEmpty = month.revenue === 0;

          return (
            <g key={month.key}>
              {/* Background track */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={6}
                fill={isHovered ? '#f1f5f9' : '#f8fafc'}
              />
              {/* Revenue bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={isEmpty ? '#e2e8f0' : isHovered ? '#2563eb' : '#3b82f6'}
                style={{ transition: 'fill 0.15s, y 0.3s, height 0.3s' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              />
              {/* Hover tooltip */}
              {isHovered && !isEmpty && (
                <g>
                  <rect
                    x={Math.min(x - 4, totalWidth - 80)}
                    y={y - 30}
                    width={76}
                    height={22}
                    rx={6}
                    fill="#1e293b"
                  />
                  <text
                    x={Math.min(x - 4, totalWidth - 80) + 38}
                    y={y - 14}
                    textAnchor="middle"
                    fill="white"
                    fontSize={10}
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {formatK(month.revenue)}
                  </text>
                </g>
              )}
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fill={isHovered ? '#1e293b' : '#94a3b8'}
                fontSize={10}
                fontWeight={isHovered ? '700' : '600'}
                fontFamily="sans-serif"
              >
                {month.label}
              </text>
              {/* Revenue label on bar top (only when not hovered) */}
              {!isHovered && !isEmpty && barH > 20 && (
                <text
                  x={x + barWidth / 2}
                  y={y + 13}
                  textAnchor="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {formatK(month.revenue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
