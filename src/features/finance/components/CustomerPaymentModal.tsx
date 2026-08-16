import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CustomerLedgerSelect } from './CustomerLedgerSelect';
import { customerLedgerKey } from '../domain/customerLedger';
import type { CustomerLedger } from '../api/useFinance';

interface FormVals {
  ledgerKey: string;
  amount: string;
  description: string;
  manufacturerId: string;
}

interface CustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: 'cash' | 'pos_own' | 'pos_manufacturer';
  mode?: 'payment' | 'refund' | undefined;
  ledgers: CustomerLedger[];
  manufacturers: { id: string; name: string }[];
  onSubmit: (data: {
    orderId: string;
    amount: number;
    manufacturerId?: string | undefined;
    description?: string | undefined;
  }) => void;
  isLoading?: boolean | undefined;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  pos_own: 'Bizim POS (Banka)',
  pos_manufacturer: 'Üretici POS',
};

export function CustomerPaymentModal({
  isOpen,
  onClose,
  method,
  mode = 'payment',
  ledgers,
  manufacturers,
  onSubmit,
  isLoading,
}: CustomerPaymentModalProps) {
  const [vals, setVals] = useState<FormVals>({
    ledgerKey: '',
    amount: '',
    description: '',
    manufacturerId: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVals({ ledgerKey: '', amount: '', description: '', manufacturerId: '' });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vals.ledgerKey) { setError('Lütfen müşteri seçin.'); return; }
    if (!vals.amount || Number(vals.amount) <= 0) { setError('Tutar 0\'dan büyük olmalı.'); return; }
    if (method === 'pos_manufacturer' && !vals.manufacturerId) { setError('Lütfen üretici seçin.'); return; }

    // Tahsilat siparişe bağlanır; siparişsiz müşteri satırına yazılamaz.
    const orderId = ledgers.find((l) => customerLedgerKey(l) === vals.ledgerKey)?.order_ids[0];
    if (!orderId) { setError('Müşteri bulunamadı.'); return; }

    onSubmit({
      orderId,
      amount: Number(vals.amount),
      manufacturerId: method === 'pos_manufacturer' ? vals.manufacturerId : undefined,
      description: vals.description || (mode === 'payment' ? 'Müşteri hesabı tahsilatı' : 'Müşteri hesabı iadesi'),
    });
  };

  const isRefund = mode === 'refund';
  const title = isRefund ? 'Müşteri Tahsilat İadesi' : 'Müşteri Tahsilatı Al';
  const accentColor = isRefund ? 'focus:ring-red-500 border-red-300' : 'focus:ring-brand-500 border-brand-300';
  const accentBg = isRefund ? 'bg-red-50 text-red-700 border-red-100' : 'bg-brand-50 text-brand-700 border-brand-100';

  const availableCustomers = isRefund
    ? ledgers.filter((l) => l.total_paid_amount > 0)
    : ledgers.filter((l) => l.remaining_balance > 0);

  const selectedLedger = ledgers.find((l) => customerLedgerKey(l) === vals.ledgerKey);

  return (
    <Modal label={title} onClose={onClose} panelClassName="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className={`px-6 py-5 text-white ${isRefund ? 'bg-gradient-to-r from-red-600 to-red-600' : 'bg-gradient-to-r from-brand-600 to-blue-600'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{title}</h3>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {METHOD_LABELS[method]}
            </span>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold border border-red-100">
              {error}
            </p>
          )}

          <CustomerLedgerSelect
            ledgers={availableCustomers}
            value={vals.ledgerKey}
            accentColor={accentColor}
            accentBg={accentBg}
            selected={selectedLedger}
            onChange={(key) => setVals({ ...vals, ledgerKey: key })}
          />

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {isRefund ? 'İade Edilecek Tutar (₺)' : 'Tahsil Edilen Tutar (₺)'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={vals.amount}
              onChange={(e) => setVals({ ...vals, amount: e.target.value })}
              placeholder="0,00"
              className="input w-full"
            />
          </div>

          {method === 'pos_manufacturer' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Üretici POS <span className="text-red-500">*</span>
              </label>
              <select
                value={vals.manufacturerId}
                onChange={(e) => setVals({ ...vals, manufacturerId: e.target.value })}
                required
                className="input w-full"
              >
                <option value="">— Üretici seçin —</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Açıklama <span className="text-slate-400 font-normal lowercase">(isteğe bağlı)</span>
            </label>
            <input
              type="text"
              value={vals.description}
              onChange={(e) => setVals({ ...vals, description: e.target.value })}
              placeholder="Örn: Geçmiş döneme ait peşinat tahsilatı"
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" loading={isLoading} disabled={!vals.ledgerKey || !vals.amount}>
              {isRefund ? 'İadeyi Kaydet' : 'Tahsilatı Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
