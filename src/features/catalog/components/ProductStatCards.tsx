import { StatCard } from '@/components/ui/StatCard';
import { compactMoney, type ProductStats } from '../domain/productStats';

const ICONS = {
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  wallet: 'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M17 13h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
} as const;

/**
 * Üst şeritteki dört ölçü.
 *
 * Eskiden dördü de ayrı pastel degrade zemindeydi (mavi, turuncu, yeşil,
 * mor) ve renkler bir şey anlatmıyordu. Ortak sayaç kabuğuna alındı;
 * renk yalnız KRİTİK STOK'ta kaldı çünkü orada gerçekten bir uyarı var —
 * ve sıfırsa kart kendiliğinden sönük çizilir, boşuna alarm vermez.
 */
export function ProductStatCards({ stats }: { stats: ProductStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Toplam Ürün" value={stats.total} icon={<path d={ICONS.box} />} />
      <StatCard
        label="Kritik Stok"
        value={stats.criticalStock}
        icon={<path d={ICONS.alert} />}
        iconClass="bg-amber-50 text-amber-600"
        valueClass="text-amber-700"
      />
      <StatCard
        label="Toplam Stok Değeri"
        value={compactMoney(stats.stockValue)}
        icon={<path d={ICONS.wallet} />}
      />
      <StatCard label="Aktif Satışta" value={stats.activeForSale} icon={<path d={ICONS.eye} />} />
    </div>
  );
}
