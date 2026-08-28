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

/** Sekmeye göre değişen işlem düğmeleri — Mobilde tam simetrik 2x2 grid, masaüstünde tek sıra. */
export function FinanceToolbar({ tab, onCustomerPayment, onIncome, onExpense }: Props) {
  if (tab === 'customers') return null;

  const posLabel = tab === 'cash' ? 'Müşteri Tahsilat' : 'Müşteri POS Tahsilatı';
  const isCash = tab === 'cash';

  return (
    <div className={`w-full md:w-auto ${isCash ? 'grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center' : 'grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center'}`}>
      {/* 1. Buton: Müşteri Tahsilat İade */}
      <Button
        size="sm"
        variant="secondary"
        className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 md:w-auto"
        onClick={() => onCustomerPayment({ method: tab, mode: 'refund' })}
      >
        {tab === 'cash' ? 'Müşteri Tahsilat İade' : '- POS İade'}
      </Button>

      {/* 2. Buton: + Müşteri Tahsilat */}
      <Button
        size="sm"
        {...(tab === 'cash' ? {} : { variant: 'success' as const })}
        className="w-full justify-center text-xs font-bold py-2 md:w-auto"
        onClick={() => onCustomerPayment({ method: tab, mode: 'payment' })}
      >
        + {posLabel}
      </Button>

      {/* 3. ve 4. Butonlar (Nakit Kasası için): + Nakit Giriş & Nakit Çıkış */}
      {isCash && (
        <>
          <Button
            size="sm"
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 md:w-auto"
            onClick={onIncome}
          >
            + Nakit Giriş
          </Button>

          <Button
            size="sm"
            className="w-full justify-center bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 md:w-auto"
            onClick={onExpense}
          >
            Nakit Çıkış
          </Button>
        </>
      )}
    </div>
  );
}
