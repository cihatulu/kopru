import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { AdminOrg } from '../api/useOrgList';

interface Props {
  org: AdminOrg;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Firma silme onayı.
 *
 * Gerçek DELETE yalnız PASİFLEŞTİRİLMİŞ kayıtlar için, admin'in cascade RPC'si
 * ile yapılır (kilitli kural 16) — bu yüzden metin geri alınamazlığı açıkça
 * söyler ve onay iki adımlıdır.
 */
export function DeleteOrgDialog({ org, pending, onClose, onConfirm }: Props) {
  return (
    <Modal
      label="Firmayı Sil"
      panelClassName="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <h3 className="text-lg font-bold text-slate-900">Firmayı Sil</h3>
      <p className="text-sm text-slate-600">
        <strong className="text-slate-900">{org.companyName}</strong> firmasını ve bu firmaya ait
        tüm verileri kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          Vazgeç
        </Button>
        <Button variant="danger" loading={pending} onClick={onConfirm}>
          Evet, Sil
        </Button>
      </div>
    </Modal>
  );
}
