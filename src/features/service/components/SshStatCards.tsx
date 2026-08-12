import type { ReactNode } from 'react';
import type { SshRequest } from '../api/useSshRequests';

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.243a2.25 2.25 0 0 0 1.07 1.916l7.5 4.615a2.25 2.25 0 0 0 2.36 0l7.5-4.615a2.25 2.25 0 0 0 1.07-1.916V12.75" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 4.5h11.25a.75.75 0 0 1 .75.75v9.75h-12V5.25a.75.75 0 0 1 .75-.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75h4.81a1.5 1.5 0 0 1 1.258.683l1.8 2.7a1.5 1.5 0 0 1 .182.717v2.4a.75.75 0 0 1-.75.75h-1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

interface CardDef {
  label: string;
  count: (r: SshRequest[]) => number;
  box: string;
  label_: string;
  value: string;
  iconBox: string;
  icon: ReactNode;
}

// Sınıf adları TAM yazılır; Tailwind kaynağı statik tarar.
const CARDS: CardDef[] = [
  {
    label: 'TOPLAM TALEP',
    count: (r) => r.length,
    box: 'from-slate-50/90 to-slate-100/70 border-slate-200/80',
    label_: 'text-slate-500',
    value: 'text-slate-900',
    iconBox: 'bg-white border-slate-200/60 text-slate-600',
    icon: <FolderIcon />,
  },
  {
    label: 'İNCELENİYOR',
    count: (r) => r.filter((x) => x.status === 'bekliyor' || x.status === 'inceleniyor').length,
    box: 'from-amber-50/90 to-amber-100/60 border-amber-200/80',
    label_: 'text-amber-700',
    value: 'text-amber-800',
    iconBox: 'bg-amber-100/80 border-amber-200/80 text-amber-700',
    icon: <ClockIcon />,
  },
  {
    label: 'PARÇA GÖNDERİLDİ',
    count: (r) => r.filter((x) => x.status === 'parca_gonderildi').length,
    box: 'from-purple-50/90 to-purple-100/60 border-purple-200/80',
    label_: 'text-purple-700',
    value: 'text-purple-800',
    iconBox: 'bg-purple-100/80 border-purple-200/80 text-purple-700',
    icon: <TruckIcon />,
  },
  {
    label: 'TAMAMLANAN',
    count: (r) => r.filter((x) => x.status === 'tamamlandi').length,
    box: 'from-emerald-50/90 to-emerald-100/60 border-emerald-200/80',
    label_: 'text-emerald-700',
    value: 'text-emerald-800',
    iconBox: 'bg-emerald-100/80 border-emerald-200/80 text-emerald-700',
    icon: <CheckIcon />,
  },
];

/** SSH panelinin özet sayaçları — YÜKLENMİŞ sayfalardan sayar, toplam değil. */
export function SshStatCards({ requests }: { requests: SshRequest[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div
          key={card.label}
          className={`group relative p-5 rounded-2xl bg-gradient-to-br border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between ${card.box}`}
        >
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-widest ${card.label_}`}>
              {card.label}
            </p>
            <p className={`text-2xl font-black mt-1.5 ${card.value}`}>{card.count(requests)}</p>
          </div>
          <div
            className={`w-11 h-11 rounded-2xl shadow-sm border flex items-center justify-center group-hover:scale-110 transition-transform ${card.iconBox}`}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
