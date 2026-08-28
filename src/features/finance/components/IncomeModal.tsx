import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
  onSubmit: (data: { type: 'income'; method: 'cash'; amount: number; description: string }) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function IncomeModal({ onClose, onSubmit, isSubmitting, error }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Modal label="Nakit Girişi Ekle" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Nakit Girişi Ekle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kasaya sipariş haricinde nakit eklemek için (Örn: Patron kasaya nakit bıraktı vb.) kullanabilirsiniz.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
            Hata: {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              type: 'income',
              method: 'cash',
              amount: Math.round((Number(amount) || 0) * 100) / 100,
              description,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              TUTAR (TL)
            </label>
            <input
              type="number"
              step="0.01"
              className="input w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="Örn: 5000"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              AÇIKLAMA
            </label>
            <input
              type="text"
              className="input w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Merkezden bırakılan nakit"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!amount}>
              Nakit Ekle
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
