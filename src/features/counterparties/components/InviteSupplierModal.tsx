import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PASSWORD_MIN_LENGTH } from '@/constants';
import { isValidVknTc } from '@/lib/tckn';

export interface InviteSupplierValues {
  companyName: string;
  phone: string;
  vknTc: string;
  password: string;
}

interface Props {
  pending: boolean;
  /** Sunucudan dönen hata — kullanıcı kodu çakışması, aynı tip firma vb. */
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: InviteSupplierValues) => void;
}

const LABEL = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';
const INPUT =
  'w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none';

function Field({
  label,
  hint,
  value,
  onChange,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'tel';
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Üretici daveti.
 *
 * Hesap DAVET OLUŞTURULURKEN kurulur; link kabul etmeye değil, karşı tarafa
 * giriş bilgilerini göstermeye yarar. Bu yüzden şifreyi davet eden belirler ve
 * bütün alanlar zorunludur — eksik bilgiyle giriş hesabı açılamaz.
 *
 * İSKONTO ALANI YOKTUR: iskontoyu üretici belirler (A5). Aynı ekranın düzenleme
 * akışı bunu zaten uyguluyordu, davet formu atlanmıştı.
 */
export function InviteSupplierModal({ pending, errorMessage, onClose, onSubmit }: Props) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [vkn, setVkn] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Davet WhatsApp'tan gider; numarasız bir daveti ulaştıracak kanal yok.
    if (!phone.trim()) return setError('Cep telefonu zorunludur; davet WhatsApp ile gönderilir.');
    if (name.trim().length < 2) return setError('Firma adı zorunludur.');
    if (!isValidVknTc(vkn.trim())) return setError('Geçerli bir VKN veya T.C. kimlik no girin.');
    if (password.length < PASSWORD_MIN_LENGTH || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
      return setError(
        `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı, bir harf ve bir rakam içermeli.`,
      );
    }
    if (password !== repeat) return setError('Şifreler eşleşmiyor.');

    onSubmit({
      companyName: name.trim(),
      phone: phone.trim(),
      vknTc: vkn.trim(),
      password,
    });
  };

  return (
    <Modal label="Üretici Davet Et" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Üretici Davet Et</h2>
          <p className="mt-1 text-sm text-slate-500">
            Giriş bilgilerini siz belirleyin; davet WhatsApp ile gönderilsin.
          </p>
        </div>

        {(error ?? errorMessage) && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
            {error ?? errorMessage}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 text-left">
          <Field
            label="Cep Telefonu"
            inputMode="tel"
            value={phone}
            onChange={setPhone}
            placeholder="Örn: 0532 000 00 00"
            hint="Davet linki bu numaraya WhatsApp ile gönderilir."
          />
          <Field
            label="Firma Adı"
            value={name}
            onChange={setName}
            placeholder="Firma Resmi Unvanı"
          />
          <Field
            label="VKN / T.C. No — Kullanıcı Kodu"
            inputMode="numeric"
            value={vkn}
            onChange={setVkn}
            placeholder="Vergi No veya T.C. Kimlik"
            hint="Bu numara aynı zamanda karşı tarafın giriş kullanıcı kodudur."
          />
          <Field label="Şifre" type="password" value={password} onChange={setPassword} />
          <Field label="Şifre (Tekrar)" type="password" value={repeat} onChange={setRepeat} />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={pending}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {pending ? 'Oluşturuluyor...' : 'Davet Oluştur ve Gönder'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
