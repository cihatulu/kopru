import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { normalizeVknTc } from '@/lib/tckn';
import type { OrgKind } from '@/constants';
import { useOrgLookup } from '../api/useOrgLookup';
import {
  canSubmit,
  needsCredentials,
  submitLabel,
  verdictFor,
  type LookupVerdict,
} from '../domain/vknLookup';
import { VknNotice } from './VknNotice';
import { CredentialFields } from './CredentialFields';
import type { CreateCustomerInput } from '../api/useCustomerMutations';

interface Props {
  myKind: OrgKind;
  myVknTc: string;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput, verdict: LookupVerdict) => void;
}

/** "Yeni Müşteri Ekle (Cari Kart)" — kaynak ekranın karşılığı. */
export function CustomerDialog({
  myKind,
  myVknTc,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [vknTc, setVknTc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authorizedName, setAuthorizedName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [discountRate, setDiscountRate] = useState('0');
  const [userCode, setUserCode] = useState('');
  const [userCodeTouched, setUserCodeTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const lookupQuery = useOrgLookup(vknTc);
  const lookup = lookupQuery.data ?? null;
  const verdict = verdictFor(lookup, myKind, myVknTc, vknTc);
  const wantsCredentials = needsCredentials(verdict, lookup);

  // İSTENEN DAVRANIŞ: kullanıcı kodu VKN yazılırken kendiliğinden dolar.
  // Kullanıcı alana elle dokunduysa bir daha EZİLMEZ — yazdığını geri almak
  // en sinir bozucu form davranışıdır.
  const effectiveUserCode = userCodeTouched ? userCode : normalizeVknTc(vknTc);

  const credentialsOk =
    !wantsCredentials ||
    (password.length >= 8 && password === passwordRepeat && effectiveUserCode.length >= 3);
  const ready = canSubmit(verdict) && credentialsOk && !pending;

  return (
    <Modal
      label="Yeni müşteri ekle"
      panelClassName="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">Yeni Müşteri Ekle (Cari Kart)</h2>

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

        {wantsCredentials && (
          <CredentialFields
            userCode={effectiveUserCode}
            password={password}
            passwordRepeat={passwordRepeat}
            onUserCode={(v) => {
              setUserCodeTouched(true);
              setUserCode(v);
            }}
            onPassword={setPassword}
            onPasswordRepeat={setPasswordRepeat}
          />
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
                ...(wantsCredentials ? { userCode: effectiveUserCode, password } : {}),
              },
              verdict,
            )
          }
        >
          {submitLabel(verdict)}
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
