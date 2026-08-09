import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/constants';

interface Props {
  companyName: string;
  pending: boolean;
  done: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
}

/**
 * Misafir müşterinin şifresini yeniler.
 *
 * Şifreyi sponsor BELİRLER, sistem üretmez: müşteriye zaten kendisi
 * iletecektir ve "geçici şifreyi bul, ilet" adımı gereksiz bir aracıdır.
 *
 * Sunucu ayrıca doğruluyor: hedef misafir olmalı ve aramızda ilişki
 * bulunmalı. Abone bir müşterinin hesabı kendisine aittir.
 */
export function ResetCustomerPasswordDialog({
  companyName,
  pending,
  done,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');

  const strong = password.length >= PASSWORD_MIN_LENGTH && PASSWORD_REGEX.test(password);
  const ready = strong && password === repeat;

  return (
    <Modal
      label="Şifre sıfırla"
      panelClassName="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      {done ? (
        <>
          <h2 className="text-lg font-extrabold text-slate-800">Şifre güncellendi</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            <strong>{companyName}</strong> artık belirlediğiniz şifreyle giriş yapabilir. Şifreyi
            kendisine iletmeyi unutmayın — bir daha gösterilmeyecek.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Kapat</Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-extrabold text-slate-800">Şifre Sıfırla</h2>
          <p className="mt-1 text-sm text-slate-600">
            <strong>{companyName}</strong> için yeni bir şifre belirleyin.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Yeni Şifre</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                En az {PASSWORD_MIN_LENGTH} karakter, en az bir harf ve bir rakam.
              </p>
            </div>

            <div>
              <label className="label">Yeni Şifre Tekrar</label>
              <input
                type="password"
                className="input"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
              {repeat.length > 0 && password !== repeat && (
                <p className="field-error">Şifreler eşleşmiyor.</p>
              )}
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              İptal
            </Button>
            <Button loading={pending} disabled={!ready} onClick={() => onSubmit(password)}>
              Şifreyi Güncelle
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
