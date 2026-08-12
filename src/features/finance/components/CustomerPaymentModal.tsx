import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
  mode?: 'payment' | 'refund';
  ledgers: CustomerLedger[];
  manufacturers: { id: string; name: string }[];
  onSubmit: (data: { orderId: string; amount: number; manufacturerId?: string; description?: string }) => void;
  isLoading?: boolean;
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

    const ledger = ledgers.find(
      (l) => `${l.customer_name}-${l.customer_phone}` === vals.ledgerKey
    );
    if (!ledger || ledger.order_ids.length === 0) { setError('Müşteri bulunamadı.'); return; }

    const orderId = ledger.order_ids[0];
    onSubmit({
      orderId,
      amount: Number(vals.amount),
      manufacturerId: method === 'pos_manufacturer' ? vals.manufacturerId : undefined,
      description: vals.description || (mode === 'payment' ? 'Müşteri hesabı tahsilatı' : 'Müşteri hesabı iadesi'),
    });
  };

  const isRefund = mode === 'refund';
  const title = isRefund ? 'Müşteri Tahsilat İadesi' : 'Müşteri Tahsilatı Al';
  const accentColor = isRefund ? 'focus:ring-rose-500 border-rose-300' : 'focus:ring-indigo-500 border-indigo-300';
  const accentBg = isRefund ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100';

  const availableCustomers = isRefund
    ? ledgers.filter(l => l.total_paid_amount > 0)
    : ledgers.filter(l => l.remaining_balance > 0);

  const selectedLedger = ledgers.find(
    (l) => `${l.customer_name}-${l.customer_phone}` === vals.ledgerKey
  );

  return (
    <Modal label={title} onClose={onClose} panelClassName="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className={`px-6 py-5 text-white ${isRefund ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-indigo-600 to-blue-600'}`}>
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Müşteri <span className="text-red-500">*</span>
            </label>
            <select
              value={vals.ledgerKey}
              onChange={(e) => setVals({ ...vals, ledgerKey: e.target.value })}
              required
              className={`input w-full ${accentColor}`}
            >
              <option value="">— Müşteri seçin —</option>
              {availableCustomers.map((l) => {
                const key = `${l.customer_name}-${l.customer_phone}`;
                return (
                  <option key={key} value={key}>
                    {l.customer_name} {l.customer_phone ? `(${l.customer_phone})` : ''} — Bakiye: ₺{l.remaining_balance.toLocaleString('tr-TR')}
                  </option>
                );
              })}
            </select>

            {selectedLedger && (
              <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium border ${accentBg}`}>
                <span>Güncel Bakiye</span>
                <span className="font-bold text-sm">₺{selectedLedger.remaining_balance.toLocaleString('tr-TR')}</span>
              </div>
            )}
          </div>

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
