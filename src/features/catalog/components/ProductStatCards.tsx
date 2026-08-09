import { compactMoney, type ProductStats } from '../domain/productStats';

const ICONS = {
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  wallet: 'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M17 13h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
} as const;

/** Üst şeritteki dört ölçü. Renkler furniture-platform'daki ekranla aynı. */
export function ProductStatCards({ stats }: { stats: ProductStats }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Toplam Ürün"
        value={String(stats.total)}
        icon={ICONS.box}
        surface="from-blue-50/60 to-indigo-50/60 border-blue-100/60"
        badge="bg-blue-500/10 text-blue-600"
      />
      <Card
        label="Kritik Stok"
        value={String(stats.criticalStock)}
        icon={ICONS.alert}
        surface="from-orange-50/60 to-amber-50/60 border-orange-100/60"
        badge="bg-orange-500/10 text-orange-600"
      />
      <Card
        label="Toplam Stok Değeri"
        value={compactMoney(stats.stockValue)}
        icon={ICONS.wallet}
        surface="from-emerald-50/60 to-teal-50/60 border-emerald-100/60"
        badge="bg-emerald-500/10 text-emerald-600"
      />
      <Card
        label="Aktif Satışta"
        value={String(stats.activeForSale)}
        icon={ICONS.eye}
        surface="from-purple-50/60 to-fuchsia-50/60 border-purple-100/60"
        badge="bg-purple-500/10 text-purple-600"
      />
    </div>
  );
}

function Card({
  label,
  value,
  icon,
  surface,
  badge,
}: {
  label: string;
  value: string;
  icon: string;
  surface: string;
  badge: string;
}) {
  return (
    <div
      className={`group flex items-center justify-between rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:shadow-md ${surface}`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-800">{value}</p>
      </div>
      <div
        className={`rounded-xl p-3 shadow-sm transition-transform group-hover:scale-110 ${badge}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d={icon} />
        </svg>
      </div>
    </div>
  );
}
