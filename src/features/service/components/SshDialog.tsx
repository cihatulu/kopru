import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (v: {
    title: string;
    description?: string;
    customerName?: string;
    customerPhone?: string;
  }) => void;
}

export function SshDialog({ pending, errorMessage, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [touched, setTouched] = useState(false);

  const titleError = touched && title.trim().length < 3 ? 'En az 3 karakter' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Servis talebi"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Servis talebi aç</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ürünle ilgili sorunu ve son müşteri bilgisini yazın.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="ssh-title">
              Konu
            </label>
            <input
              id="ssh-title"
              className="input"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {titleError && <p className="field-error">{titleError}</p>}
          </div>

          <div>
            <label className="label" htmlFor="ssh-desc">
              Açıklama
            </label>
            <textarea
              id="ssh-desc"
              className="input min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ssh-cn">
                Müşteri adı
              </label>
              <input
                id="ssh-cn"
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="ssh-cp">
                Telefon
              </label>
              <input
                id="ssh-cp"
                className="input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
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
              if (title.trim().length < 3) return;
              onSubmit({
                title: title.trim(),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
              });
            }}
          >
            Talebi aç
          </Button>
        </div>
      </div>
    </div>
  );
}
