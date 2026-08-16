import { formatMoney } from '@/lib/format';
import type { SetLineInput } from '../domain/setBuilder';

interface Props {
  lines: SetLineInput[];
  onQuantityChange: (productId: string, quantity: number) => void;
}

/** Takım içeriği: kalemler ve miktar ayarı. */
export function SetLineList({ lines, onQuantityChange }: Props) {
  return (
    <div className="space-y-1 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
      {lines.map((l) => (
        <div key={l.productId} className="flex items-center gap-3 py-1">
          <span className="flex-1 truncate text-sm text-slate-700">{l.name}</span>
          <span className="text-xs text-slate-400">{formatMoney(l.unitPrice)}</span>
          <div className="flex items-center gap-1">
            <StepButton
              label={`${l.name} miktarını azalt`}
              onClick={() => onQuantityChange(l.productId, l.quantity - 1)}
            >
              −
            </StepButton>
            <span className="w-8 text-center text-sm font-bold text-slate-800">{l.quantity}</span>
            <StepButton
              label={`${l.name} miktarını artır`}
              onClick={() => onQuantityChange(l.productId, l.quantity + 1)}
            >
              +
            </StepButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="size-7 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
