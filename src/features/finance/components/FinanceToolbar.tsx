import { Button } from '@/components/ui/Button';
import type { FinanceTab } from '../api/useFinancePage';

export type PaymentTarget = {
  method: 'cash' | 'pos_own' | 'pos_manufacturer';
  mode: 'payment' | 'refund';
};

interface Props {
  tab: FinanceTab;
  onCustomerPayment: (target: PaymentTarget) => void;
  onIncome: () => void;
  onExpense: () => void;
}

/** Sekmeye göre değişen işlem düğmeleri. Müşteri carileri sekmesinde düğme yok. */
export function FinanceToolbar({ tab, onCustomerPayment, onIncome, onExpense }: Props) {
  if (tab === 'customers') return null;

  const posLabel = tab === 'cash' ? 'Müşteri Tahsilat' : 'Müşteri POS Tahsilatı';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        className="border-red-200 text-red-600 hover:bg-red-50"
        onClick={() => onCustomerPayment({ method: tab, mode: 'refund' })}
      >
        {tab === 'cash' ? 'Müşteri Tahsilat İade' : '- Müşteri POS İade'}
      </Button>

      <Button
        size="sm"
        // Nakit tahsilat marka rengiyle, POS tahsilatı onay yeşiliyle:
        // ikisi ayrı para akışı ve kullanıcı hangisine bastığını renkten de
        // ayırt ediyor.
        {...(tab === 'cash' ? {} : { variant: 'success' as const })}
        onClick={() => onCustomerPayment({ method: tab, mode: 'payment' })}
      >
        + {posLabel}
      </Button>

      {tab === 'cash' && (
        <>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={onIncome}>
            + Nakit Giriş
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={onExpense}>
            Nakit Çıkış
          </Button>
        </>
      )}
    </div>
  );
}
