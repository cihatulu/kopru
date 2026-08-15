import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  title: string;
  /** Ne olacağını AÇIKÇA yazar — "emin misiniz?" tek başına bilgi vermez. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Yıkıcı eylemlerde kırmızı onay düğmesi. */
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Geri alınması zor bir işlemden önce onay ister. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Evet, uygula',
  cancelLabel = 'Vazgeç',
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      label={title}
      panelClassName="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      onClose={onCancel}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="text-sm leading-relaxed text-slate-600">{message}</div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
