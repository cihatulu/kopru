import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { CustomerLedger } from '../domain/customerLedger';

interface Props {
  customer: CustomerLedger;
  onClose: () => void;
}

/** Müşterinin iletişim bilgileri — cari satırından açılır, salt okunur. */
export function CustomerInfoModal({ customer, onClose }: Props) {
  return (
    <Modal label="Müşteri Bilgileri" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Müşteri Bilgileri</h3>
          <p className="text-sm text-slate-500">{customer.customer_name}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm text-slate-700">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Telefon</span>
            <div>{customer.customer_phone || '—'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Adres</span>
            <div>{customer.customer_address || 'Belirtilmemiş.'}</div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
