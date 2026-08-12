import { IncomeModal } from './IncomeModal';
import { ExpenseModal } from './ExpenseModal';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { CustomerInfoModal } from './CustomerInfoModal';
import type { PaymentTarget } from './FinanceToolbar';
import type { CustomerLedger } from '../domain/customerLedger';
import type { FinanceKind, PaymentMethod } from '../domain/finance';

export type FinanceModalKind = 'none' | 'income' | 'expense' | 'payment';

export interface FinanceEntryDraft {
  type: FinanceKind;
  method: PaymentMethod;
  amount: number;
  description: string;
  order_id?: string | undefined;
  manufacturer_id?: string | undefined;
}

interface Props {
  kind: FinanceModalKind;
  target: PaymentTarget;
  ledgers: CustomerLedger[];
  manufacturers: { id: string; name: string }[];
  customer: CustomerLedger | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onCloseCustomer: () => void;
  onSubmit: (draft: FinanceEntryDraft) => void;
}

/** Finans ekranının dört penceresi; hangisinin açık olduğu tek `kind` ile taşınır. */
export function FinanceModals({
  kind,
  target,
  ledgers,
  manufacturers,
  customer,
  pending,
  error,
  onClose,
  onCloseCustomer,
  onSubmit,
}: Props) {
  return (
    <>
      {kind === 'expense' && (
        <ExpenseModal onClose={onClose} onSubmit={onSubmit} isSubmitting={pending} error={error} />
      )}

      {kind === 'income' && (
        <IncomeModal onClose={onClose} onSubmit={onSubmit} isSubmitting={pending} error={error} />
      )}

      {kind === 'payment' && (
        <CustomerPaymentModal
          isOpen
          onClose={onClose}
          method={target.method}
          mode={target.mode}
          ledgers={ledgers}
          manufacturers={manufacturers}
          isLoading={pending}
          onSubmit={(data) =>
            onSubmit({
              // İade defterde GİDER satırıdır: para kasadan çıkar.
              type: target.mode === 'refund' ? 'expense' : 'income',
              method: target.method,
              amount: data.amount,
              description: data.description ?? '',
              order_id: data.orderId,
              manufacturer_id: data.manufacturerId,
            })
          }
        />
      )}

      {customer && <CustomerInfoModal customer={customer} onClose={onCloseCustomer} />}
    </>
  );
}
