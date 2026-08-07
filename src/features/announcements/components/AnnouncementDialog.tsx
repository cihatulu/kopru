import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (v: { title: string; body: string }) => void;
}

export function AnnouncementDialog({ pending, errorMessage, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [touched, setTouched] = useState(false);

  const titleError = touched && title.trim().length < 3 ? 'En az 3 karakter' : null;
  const bodyError = touched && body.trim().length < 1 ? 'Duyuru metni zorunlu' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Duyuru yayınla"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Duyuru yayınla</h2>
        <p className="mt-1 text-sm text-slate-500">
          Duyuru, aktif ilişkiniz olan tüm perakendecilere görünür.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="ann-title">
              Başlık
            </label>
            <input
              id="ann-title"
              className="input"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {titleError && <p className="field-error">{titleError}</p>}
          </div>

          <div>
            <label className="label" htmlFor="ann-body">
              Metin
            </label>
            <textarea
              id="ann-body"
              className="input min-h-40"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {bodyError && <p className="field-error">{bodyError}</p>}
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
              if (title.trim().length < 3 || body.trim().length < 1) return;
              onSubmit({ title: title.trim(), body: body.trim() });
            }}
          >
            Yayınla
          </Button>
        </div>
      </div>
    </div>
  );
}
