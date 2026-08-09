import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';
import { ORG_KIND, type OrgKind } from '@/constants';

interface Props {
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (v: {
    companyName: string;
    vknTc?: string;
    kind?: OrgKind;
    city?: string;
    phone?: string;
    email?: string;
    note?: string;
  }) => void;
}

export function LeadDialog({ pending, errorMessage, onClose, onSubmit }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [vknTc, setVknTc] = useState('');
  const [kind, setKind] = useState<OrgKind | ''>('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const nameError = touched && companyName.trim().length < 2 ? 'En az 2 karakter' : null;
  // VKN isteğe bağlı ama girilirse checksum tutmalı — yakınsama bu alandan yürür.
  const vknError =
    touched && vknTc.trim() && !isValidVknTc(normalizeVknTc(vknTc))
      ? 'Geçerli bir VKN veya T.C. No girin'
      : null;

  return (
    <Modal
      label={'Aday ekle'}
      panelClassName={
        'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">Aday ekle</h2>
      <p className="mt-1 text-sm text-slate-500">
        VKN girerseniz, firma sisteme kaydolduğunda aday otomatik olarak müşteriye dönüşür.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="lead-name">
            Firma adı
          </label>
          <input
            id="lead-name"
            className="input"
            autoFocus
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {nameError && <p className="field-error">{nameError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="lead-vkn">
              VKN / T.C. (isteğe bağlı)
            </label>
            <input
              id="lead-vkn"
              className="input"
              inputMode="numeric"
              value={vknTc}
              onChange={(e) => setVknTc(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {vknError && <p className="field-error">{vknError}</p>}
          </div>
          <div>
            <label className="label" htmlFor="lead-kind">
              Tip
            </label>
            <select
              id="lead-kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as OrgKind | '')}
            >
              <option value="">Belirsiz</option>
              <option value={ORG_KIND.manufacturer}>Üretici</option>
              <option value={ORG_KIND.retailer}>Perakendeci</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="lead-city">
              Şehir
            </label>
            <input
              id="lead-city"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="lead-phone">
              Telefon
            </label>
            <input
              id="lead-phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="lead-email">
            E-posta
          </label>
          <input
            id="lead-email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
            if (companyName.trim().length < 2) return;
            const v = normalizeVknTc(vknTc);
            if (v && !isValidVknTc(v)) return;
            onSubmit({
              companyName: companyName.trim(),
              ...(v ? { vknTc: v } : {}),
              ...(kind ? { kind } : {}),
              ...(city.trim() ? { city: city.trim() } : {}),
              ...(phone.trim() ? { phone: phone.trim() } : {}),
              ...(email.trim() ? { email: email.trim() } : {}),
            });
          }}
        >
          Ekle
        </Button>
      </div>
    </Modal>
  );
}
