import { StatCard } from '@/components/ui/StatCard';
import type { SshRequest } from '../api/useSshRequests';

/*
  Ortak sayaç kabuğuna geçti. Eskiden degrade zemin, `hover:-translate-y-0.5`
  ile yukarı zıplayan kart ve `group-hover:scale-110` ile büyüyen ikon vardı;
  aynı sayfada duran diğer kartlar bunların hiçbirini yapmıyordu.

  "Parça gönderildi" moru bırakıldı: mor bu üründe başka hiçbir anlama
  bağlı değildi. Sevkiyat gökyüzü mavisi — siparişlerdeki "Sevkiyatta"
  kartıyla artık aynı renk, çünkü aynı şeyi anlatıyorlar.
*/
interface CardDef {
  label: string;
  count: (r: SshRequest[]) => number;
  icon: string;
  iconClass: string;
  valueClass: string;
}

const CARDS: CardDef[] = [
  {
    label: 'Toplam Talep',
    count: (r) => r.length,
    icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
    iconClass: 'bg-slate-100 text-slate-500',
    valueClass: 'text-slate-900',
  },
  {
    label: 'İnceleniyor',
    count: (r) => r.filter((x) => x.status === 'bekliyor' || x.status === 'inceleniyor').length,
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    iconClass: 'bg-amber-50 text-amber-600',
    valueClass: 'text-amber-700',
  },
  {
    label: 'Parça Gönderildi',
    count: (r) => r.filter((x) => x.status === 'parca_gonderildi').length,
    icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1',
    iconClass: 'bg-sky-50 text-sky-600',
    valueClass: 'text-sky-700',
  },
  {
    label: 'Tamamlanan',
    count: (r) => r.filter((x) => x.status === 'tamamlandi').length,
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconClass: 'bg-emerald-50 text-emerald-600',
    valueClass: 'text-emerald-700',
  },
];

/** SSH panelinin özet sayaçları — YÜKLENMİŞ sayfalardan sayar, toplam değil. */
export function SshStatCards({ requests }: { requests: SshRequest[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((c) => (
        <StatCard
          key={c.label}
          label={c.label}
          value={c.count(requests)}
          iconClass={c.iconClass}
          valueClass={c.valueClass}
          icon={<path d={c.icon} />}
        />
      ))}
    </div>
  );
}
