import { StatCard } from '@/components/ui/StatCard';
import { formatMoney } from '@/lib/format';
import type { Kpi } from '../domain/profitability';

/*
  Ortak sayaç kabuğuna geçti. Eskiden kart yatay düzendeydi (ikon solda,
  metin sağda) ve renkli zemin kullanıyordu; aynı ekrandaki diğer sayaç
  kartlarıyla ne yüksekliği ne başlık ölçüsü tutuyordu.

  Mavi ve mor tonlar kaldırıldı: "Toplam Sipariş" ile "Aktif Bayi" birer
  sayımdır, iyi ya da kötü değildirler. Renk yalnız Net Kâr'da kaldı —
  orada işaretin anlamı var.
*/
const CARDS = [
  {
    key: 'totalOrders' as const,
    label: 'Toplam Sipariş',
    money: false,
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    key: 'totalRevenue' as const,
    label: 'Toplam Ciro',
    money: true,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'activeRetailers' as const,
    label: 'Aktif Bayi',
    money: false,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  },
];

const PROFIT_ICON = 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';

export function ReportKpiCards({ kpi }: { kpi: Kpi }) {
  // Zarar kırmızı okunur. Tek renkte bırakmak, eksi bir kârı olumlu bir
  // sayı gibi gösteriyordu.
  const loss = kpi.netProfit < 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((c) => (
        <StatCard
          key={c.key}
          label={c.label}
          value={c.money ? formatMoney(kpi[c.key]) : String(kpi[c.key])}
          icon={<path d={c.icon} />}
        />
      ))}
      <StatCard
        label="Net Kâr"
        value={formatMoney(kpi.netProfit)}
        icon={<path d={PROFIT_ICON} />}
        iconClass={loss ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
        valueClass={loss ? 'text-red-700' : 'text-emerald-700'}
      />
    </div>
  );
}
