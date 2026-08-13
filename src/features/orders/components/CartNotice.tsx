import { Button } from '@/components/ui/Button';

interface Props {
  tone: 'empty' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

const ICON = {
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="size-10 text-slate-300">
      <path d="M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-10 text-emerald-500">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
};

const BOX = {
  empty: 'from-slate-50 to-slate-100',
  success: 'from-emerald-50 to-teal-100',
};

/** Sepetin boş ya da siparişin alınmış hâli — tek kabuk, iki ton. */
export function CartNotice({ tone, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${BOX[tone]} flex items-center justify-center`}>
        {ICON[tone]}
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-600">{title}</p>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>
      <Button onClick={onAction} className="mt-2">
        {actionLabel}
      </Button>
    </div>
  );
}
