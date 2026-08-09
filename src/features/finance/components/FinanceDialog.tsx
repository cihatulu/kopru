import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  FINANCE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  affectsOwnCash,
  type FinanceKind,
  type PaymentMethod,
} from '../domain/finance';

interface Props {
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (v: {
    kind: FinanceKind;
    amount: number;
    method: PaymentMethod;
    description: string;
    category?: string;
  }) => void;
}

export function FinanceDialog({ pending, errorMessage, onClose, onSubmit }: Props) {
  const [kind, setKind] = useState<FinanceKind>('income');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  const amountNum = Number(amount);
  const amountError =
    touched && (!amount || Number.isNaN(amountNum) || amountNum <= 0)
      ? 'Sıfırdan büyük olmalı'
      : null;
  const descError = touched && description.trim().length === 0 ? 'Açıklama zorunlu' : null;

  return (
    <Modal
      label={'Finans kaydı'}
      panelClassName={
        'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">Kayıt ekle</h2>

      <div className="mt-5 space-y-4">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(['income', 'expense'] as FinanceKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {FINANCE_KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="fin-amount">
            Tutar (₺)
          </label>
          <input
            id="fin-amount"
            type="number"
            step="0.01"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {amountError && <p className="field-error">{amountError}</p>}
        </div>

        <div>
          <label className="label" htmlFor="fin-method">
            Ödeme yöntemi
          </label>
          <select
            id="fin-method"
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {!affectsOwnCash(method) && (
            <p className="mt-1 text-xs text-amber-700">
              Bu tahsilat doğrudan üreticiye gider; kendi kasanıza girmez.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="fin-desc">
            Açıklama
          </label>
          <input
            id="fin-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {descError && <p className="field-error">{descError}</p>}
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Vazgeç
        </Button>
        <Button
          loading={pending}
          onClick={() => {
            setTouched(true);
            if (!amount || Number.isNaN(amountNum) || amountNum <= 0) return;
            if (description.trim().length === 0) return;
            onSubmit({ kind, amount: amountNum, method, description: description.trim() });
          }}
        >
          Kaydet
        </Button>
      </div>
    </Modal>
  );
}
