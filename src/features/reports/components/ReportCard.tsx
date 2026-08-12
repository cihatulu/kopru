import type { ReactNode } from 'react';
import type { ReportProduct } from '../domain/reportTypes';

interface Props {
  title: string;
  /** Başlıktaki renk çubuğu — kartları birbirinden ayırır. */
  accent: string;
  actionLabel: string;
  actionTone?: string;
  onAction: () => void;
  children: ReactNode;
}

/** Genel özet sekmesindeki kart kabuğu. */
export function ReportCard({ title, accent, actionLabel, actionTone, onAction, children }: Props) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-4 rounded-full ${accent}`} />
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onAction}
          className={`text-xs font-bold transition-colors cursor-pointer ${
            actionTone ?? 'text-blue-600 hover:text-blue-800'
          }`}
        >
          {actionLabel}
        </button>
      </div>
      <div className="flex-1 space-y-3">{children}</div>
    </div>
  );
}

const FurnitureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 text-slate-400 p-2 border">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/** Ürün küçük görseli; görsel yoksa yer tutucu ikon. */
export function ProductThumb({ product }: { product: ReportProduct }) {
  const src = product.images[0];
  if (!src) return <FurnitureIcon />;
  return <img src={src} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border" />;
}

export function RankBadge({ index, tone }: { index: number; tone: string }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
        index === 0 ? tone : 'bg-slate-100 text-slate-500'
      }`}
    >
      {index + 1}
    </div>
  );
}

export const EmptyNote = ({ children }: { children: ReactNode }) => (
  <p className="text-slate-400 text-xs italic py-4 text-center">{children}</p>
);

export const RowShell = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
    {children}
  </div>
);
