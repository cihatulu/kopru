import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface InviteSupplierValues {
  companyName: string;
  email: string;
  phone: string;
  vknTc: string;
  discountRate: number;
}

interface Props {
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: InviteSupplierValues) => void;
}

const LABEL = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';
const INPUT =
  'w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none';

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  );
}

/** WhatsApp üzerinden paylaşılacak üretici daveti oluşturur. */
export function InviteSupplierModal({ pending, onClose, onSubmit }: Props) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [vkn, setVkn] = useState('');
  const [discount, setDiscount] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Davet ya telefona ya e-postaya gider; ikisi de boşsa ulaştıracak kanal yok.
    if (!phone.trim() && !email.trim()) {
      setError('Telefon numarası veya e-posta adresinden en az biri girilmelidir.');
      return;
    }
    onSubmit({
      companyName: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      vknTc: vkn.trim(),
      discountRate: Number(discount),
    });
  };

  return (
    <Modal label="Üretici Davet Et" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Üretici Davet Et</h2>
          <p className="mt-1 text-sm text-slate-500">
            WhatsApp üzerinden göndermek için bir davet linki ve token oluşturun.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 text-left">
          <Field
            label="Telefon Numarası"
            value={phone}
            onChange={setPhone}
            placeholder="Örn: 905xxxxxxxxx"
          />
          <Field
            label="E-posta Adresi"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Ornek: uretici@firma.com"
          />
          <Field
            label="Firma Adı (İsteğe Bağlı)"
            value={name}
            onChange={setName}
            placeholder="Firma Resmi Unvanı"
          />
          <Field
            label="VKN / T.C. No (İsteğe Bağlı)"
            value={vkn}
            onChange={setVkn}
            placeholder="Vergi No veya T.C. Kimlik"
          />
          <Field
            label="İskonto Oranı (%)"
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={setDiscount}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={pending}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {pending ? 'Davet Oluşturuluyor...' : 'Davet Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
