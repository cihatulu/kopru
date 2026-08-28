import type { ReactNode } from 'react';
import type { ReportProduct } from '../domain/reportTypes';

interface Props {
  title: string;
  /** Başlıktaki renk çubuğu — kartları birbirinden ayırır. */
  accent: string;
  actionLabel?: string;
  actionTone?: string;
  onAction: () => void;
  children: ReactNode;
}

/** Genel özet sekmesindeki kart kabuğu. */
export function ReportCard({
  title,
  accent,
  actionLabel = 'Tümünü Gör',
  actionTone,
  onAction,
  children,
}: Props) {
  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-1 h-3.5 rounded-full ${accent}`} />
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">{title}</h2>
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
        <div className="space-y-2.5">{children}</div>
      </div>
    </div>
  );
}

const FurnitureIcon = () => (
  <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 p-1.5 border border-slate-200/60 shadow-2xs">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>
);

/** Ürün küçük görseli; görsel yoksa yer tutucu ikon. */
export function ProductThumb({ product }: { product: ReportProduct }) {
  const src = product.images[0];
  if (!src) return <FurnitureIcon />;
  return <img src={src} alt="" className="size-8 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200/60 shadow-2xs" />;
}

export function RankBadge({ index, tone }: { index: number; tone: string }) {
  return (
    <div
      className={`size-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 shadow-2xs ${
        index === 0 ? tone : 'bg-slate-100 text-slate-600 border border-slate-200/60'
      }`}
    >
      {index + 1}
    </div>
  );
}

export const EmptyNote = ({ children }: { children: ReactNode }) => (
  <p className="text-slate-400 text-xs font-medium py-4 text-center">{children}</p>
);

export const RowShell = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 p-2.5 px-3 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-100/60 transition-colors">
    {children}
  </div>
);
