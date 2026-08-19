import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { normalizeVknTc } from '@/lib/tckn';
import { ORG_KIND, type OrgKind } from '@/constants';
import { useOrgLookup } from '../api/useOrgLookup';
import {
  canSubmit,
  submitLabel,
  verdictFor,
  type LookupVerdict,
} from '../domain/vknLookup';
import { VknNotice } from './VknNotice';
import type { CreateCustomerInput, CreateCustomerResult } from '../api/useCustomerMutations';

function generateRandomPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let password = '';
  password += letters[Math.floor(Math.random() * letters.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  const allChars = letters + digits;
  for (let i = 2; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

interface Props {
  myKind: OrgKind;
  myVknTc: string;
  pending: boolean;
  errorMessage?: string | undefined;
  result?: CreateCustomerResult | null;
  generatedPassword?: string;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput, verdict: LookupVerdict) => void;
}

/** "Yeni Müşteri Ekle (Cari Kart)" — kaynak ekranın karşılığı. */
export function CustomerDialog({
  myKind,
  myVknTc,
  pending,
  errorMessage,
  result,
  generatedPassword,
  onClose,
  onSubmit,
}: Props) {
  const [autoPassword] = useState(() => generateRandomPassword());
  const [vknTc, setVknTc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authorizedName, setAuthorizedName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [discountRate, setDiscountRate] = useState('0');
  const lookupQuery = useOrgLookup(vknTc);
  const lookup = lookupQuery.data ?? null;
  const verdict = verdictFor(lookup, myKind, myVknTc, vknTc);

  const effectiveUserCode = normalizeVknTc(vknTc);
  const ready = canSubmit(verdict) && !pending;

  return (
    <Modal
      label={myKind === ORG_KIND.manufacturer ? 'Yeni Müşteri Ekle' : 'Yeni Üretici Ekle'}
      panelClassName="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      {result ? (
        verdict === 'existing-subscriber' ? (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto text-blue-500 text-xl font-bold">
              ℹ️
            </div>
            <h3 className="text-base font-bold text-slate-800">İlişki İsteği Gönderildi</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Bu {myKind === ORG_KIND.manufacturer ? 'perakendeci' : 'üretici'} de platformun abonesi olduğu için bağlantı isteği gönderildi. Karşı taraf kendi panelinden onayladığında ilişki aktifleşecektir.
            </p>
            <div className="flex justify-center pt-4 border-t border-slate-100">
              <Button onClick={onClose}>Kapat</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Misafir {myKind === ORG_KIND.manufacturer ? 'Müşteri' : 'Üretici'} Giriş Bilgileri
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Misafir {myKind === ORG_KIND.manufacturer ? 'perakendeci' : 'üretici'} sisteme giriş yaparken aşağıdaki bilgileri kullanacaktır. Bu bilgileri kopyalayıp kendisiyle paylaşabilirsiniz:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Sizi Ekleyen {myKind === ORG_KIND.manufacturer ? 'Üreticinin' : 'Perakendecinin'} VKN'si:</span>
                  <span className="font-mono font-bold text-slate-800 select-all">{myVknTc}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Vergi No / Kullanıcı Kodu:</span>
                  <span className="font-mono font-bold text-slate-800 select-all">{result.userCode}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Şifre:</span>
                  <span className="font-mono font-bold text-slate-800 select-all">{generatedPassword}</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 leading-relaxed font-semibold">
                ⚠️ Bu bilgilerle giriş yaptığınızda onay vermiş olacaksınız.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        )
      ) : (
        <>
          <h2 className="text-lg font-extrabold text-slate-800">
            {myKind === ORG_KIND.manufacturer ? 'Yeni Müşteri Ekle' : 'Yeni Üretici Ekle'} (Cari Kart)
          </h2>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="İndirim Oranı (%)">
                <input
                  className="input"
                  inputMode="decimal"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                />
              </Field>
              <Field label="VKN / T.C. No">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Vergi veya T.C. Kimlik No"
                  value={vknTc}
                  onChange={(e) => setVknTc(e.target.value)}
                />
              </Field>
            </div>

            <VknNotice
              verdict={verdict}
              lookup={lookup}
              myKind={myKind}
              loading={lookupQuery.isFetching}
            />

            {(verdict === 'new' || verdict === 'existing-guest') && (
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700 ring-1 ring-inset ring-blue-200">
                ℹ️ Bu misafir firma için giriş şifresi sistem tarafından otomatik olarak üretilecek ve işlemin sonunda size gösterilecektir.
              </p>
            )}

            {verdict === 'existing-subscriber' && (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-200">
                Bu firma platformun abonesi; kendi giriş hesabı var. Şifre belirlemenize gerek yok.
              </p>
            )}

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
              disabled={!ready}
              onClick={() =>
                onSubmit(
                  {
                    vknTc: normalizeVknTc(vknTc),
                    ...(companyName ? { companyName } : {}),
                    ...(authorizedName ? { authorizedName } : {}),
                    ...(email ? { email } : {}),
                    ...(phone ? { phone } : {}),
                    ...(address ? { address } : {}),
                    discountRate: Number(discountRate.replace(',', '.')) || 0,
                    ...(verdict === 'new' || verdict === 'existing-guest'
                      ? { userCode: effectiveUserCode, password: autoPassword }
                      : {}),
                  },
                  verdict,
                )
              }
            >
              {submitLabel(verdict)}
            </Button>
          </div>
        </>
      )}
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
