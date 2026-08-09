import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Party } from '../domain/counterparty';

interface Props {
  party: Party;
  discountRate: number;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: {
    companyName: string;
    authorizedName: string;
    email: string;
    phone: string;
    address: string;
    discountRate: number;
  }) => void;
}

/**
 * Müşteri kartını düzenler.
 *
 * VKN DEĞİŞTİRİLEMEZ: o, firmanın sistemdeki kimliği ve yakınsama anahtarıdır
 * (A3). Değiştirilebilseydi iki ayrı firma aynı kayda çakışır ya da mevcut
 * kayıt başka bir firmanın numarasını üstlenirdi.
 */
export function EditCustomerDialog({
  party,
  discountRate,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [companyName, setCompanyName] = useState(party.companyName);
  const [authorizedName, setAuthorizedName] = useState(party.authorizedName ?? '');
  const [email, setEmail] = useState(party.email ?? '');
  const [phone, setPhone] = useState(party.phone ?? '');
  const [address, setAddress] = useState(party.address ?? '');
  const [discount, setDiscount] = useState(String(discountRate));

  return (
    <Modal
      label="Müşteriyi düzenle"
      panelClassName="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">Müşteriyi Düzenle</h2>
      <p className="mt-1 font-mono text-xs text-slate-400">VKN / T.C. No: {party.vknTc}</p>

      <div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Firma Adı">
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <Field label="Yetkili Adı Soyadı">
            <input className="input" value={authorizedName} onChange={(e) => setAuthorizedName(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-posta">
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Telefon">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>

        <Field label="Adres">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        <Field label="İndirim Oranı (%)">
          <input
            className="input"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            İskonto ilişkiye aittir; sonraki siparişlerin fiyatını etkiler, geçmiş siparişler
            olduğu gibi kalır.
          </p>
        </Field>

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
        <Button
          loading={pending}
          disabled={companyName.trim().length < 2}
          onClick={() =>
            onSubmit({
              companyName: companyName.trim(),
              authorizedName: authorizedName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              address: address.trim(),
              discountRate: Number(discount.replace(',', '.')) || 0,
            })
          }
        >
          Kaydet
        </Button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
