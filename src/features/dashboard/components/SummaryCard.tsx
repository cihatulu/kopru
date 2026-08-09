export type CardTone =
  'blue' | 'purple' | 'amber' | 'rose' | 'yellow' | 'emerald' | 'pink' | 'teal';

const TONES: Record<CardTone, { card: string; icon: string; dot: string }> = {
  blue: {
    card: 'from-blue-50 to-blue-100/60 border-blue-100',
    icon: 'bg-blue-500',
    dot: 'bg-blue-500',
  },
  purple: {
    card: 'from-purple-50 to-purple-100/60 border-purple-100',
    icon: 'bg-purple-500',
    dot: 'bg-purple-500',
  },
  amber: {
    card: 'from-amber-50 to-amber-100/60 border-amber-100',
    icon: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  rose: {
    card: 'from-rose-50 to-rose-100/60 border-rose-100',
    icon: 'bg-rose-500',
    dot: 'bg-rose-500',
  },
  yellow: {
    card: 'from-yellow-50 to-yellow-100/60 border-yellow-100',
    icon: 'bg-yellow-500',
    dot: 'bg-yellow-500',
  },
  emerald: {
    card: 'from-emerald-50 to-emerald-100/60 border-emerald-100',
    icon: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  pink: {
    card: 'from-pink-50 to-pink-100/60 border-pink-100',
    icon: 'bg-pink-500',
    dot: 'bg-pink-500',
  },
  teal: {
    card: 'from-teal-50 to-teal-100/60 border-teal-100',
    icon: 'bg-teal-500',
    dot: 'bg-teal-500',
  },
};

interface Props {
  title: string;
  value: string;
  /** Sayının ne anlama geldiğini söyleyen tek satır. */
  hint: string;
  icon: string;
  tone: CardTone;
}

export function SummaryCard({ title, value, hint, icon, tone }: Props) {
  const t = TONES[tone];
  return (
    <div
      className={`relative flex min-w-0 flex-col justify-between rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-shadow hover:shadow-md ${t.card}`}
    >
      <div
        className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-xl text-white shadow-sm ${t.icon}`}
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

      <p className="mb-1.5 pr-12 text-[10.5px] font-bold uppercase leading-none tracking-wider text-slate-500">
        {title}
      </p>
      <p className="pr-12 text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-4 flex items-center gap-1.5 truncate text-[10px] font-medium text-slate-500">
        <span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} />
        <span className="truncate">{hint}</span>
      </p>
    </div>
  );
}
