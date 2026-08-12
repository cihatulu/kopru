import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  /** "Üreticiyi" / "Firmayı" — ekrana göre değişen tek şey. */
  noun: string;
  pending: boolean;
  errorMessage?: string | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Karşı tarafı kalıcı siler.
 *
 * Kural 16: gerçek DELETE yalnız pasifleştirilmiş kayıtlar için, kaydın sahibi
 * org tarafından yapılabilir — yetki sunucuda `delete_counterparty` RPC'sinde
 * doğrulanır. Buradaki onay yalnız kullanıcı arayüzü koruması.
 */
export function DeleteCounterpartyConfirm({
  noun,
  pending,
  errorMessage,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      label={`${noun} Sil`}
      panelClassName="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      onClose={onCancel}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">{noun} Sil</h2>
      <p className="mt-2 text-sm text-slate-600">
        Bu kaydı tamamen silmek istediğinize emin misiniz?
      </p>
      {errorMessage && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          İptal
        </Button>
        <Button variant="danger" loading={pending} onClick={onConfirm}>
          Sil
        </Button>
      </div>
    </Modal>
  );
}
