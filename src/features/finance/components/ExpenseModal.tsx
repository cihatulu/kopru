import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
  onSubmit: (data: { type: 'expense'; method: 'cash'; amount: number; description: string }) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function ExpenseModal({ onClose, onSubmit, isSubmitting, error }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Modal label="Genel Gider Çıkışı Yap" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Genel Gider Çıkışı Yap</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kasadan yapılan genel giderleri (Kırtasiye, yemek, maaş avansı vb.) girin. Bu işlem nakit kasanızdan düşecektir.
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
            onSubmit({ type: 'expense', method: 'cash', amount: Number(amount), description });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              TUTAR (TL)
            </label>
            <input
              type="number"
              className="input w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Örn: 1500"
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
              placeholder="Örn: Kırtasiye malzemesi alımı"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!amount}>
              Gider Kaydet
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
