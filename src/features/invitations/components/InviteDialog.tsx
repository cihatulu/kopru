import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { ORG_KIND, type OrgKind } from '@/constants';
import { createInviteSchema, type CreateInviteForm } from '../domain/inviteSchema';
import { inviteNoun, type Invitation } from '../domain/invitation';
import { InviteLinkPanel } from './InviteLinkPanel';

interface Props {
  myKind: OrgKind;
  pending: boolean;
  created: Invitation | null;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: CreateInviteForm) => void;
}

/**
 * Davet oluşturma.
 *
 * `add_counterparty`'den farkı: burada karşı tarafın bilgileri ZORUNLU DEĞİL.
 * Yalnız link üretilir; firma adını, yetkilisini ve şifresini karşı taraf
 * kendi girer. Doldurulan alanlar onun formunda ön dolgu olarak görünür.
 */
export function InviteDialog(props: Props) {
  const { myKind, pending, created, errorMessage, onClose, onSubmit } = props;
  const noun = inviteNoun(myKind);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInviteForm>({ resolver: zodResolver(createInviteSchema) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${noun} davet et`}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        {created ? (
          <InviteLinkPanel invitation={created} noun={noun} onClose={onClose} />
        ) : (
          <>
            <h2 className="text-lg font-bold capitalize text-slate-900">{noun} davet et</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bir davet linki üretilir. Karşı taraf linki açıp kendi bilgilerini ve şifresini
              girdiğinde ilişki kurulur — geçici şifre iletmenize gerek kalmaz.
            </p>

            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-5 space-y-4">
              <Field label="Firma adı (isteğe bağlı)" error={errors.companyName?.message}>
                <input id="companyName" className="input" {...register('companyName')} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefon" error={errors.phone?.message}>
                  <input id="phone" className="input" {...register('phone')} />
                </Field>
                <Field label="E-posta" error={errors.email?.message}>
                  <input id="email" className="input" {...register('email')} />
                </Field>
              </div>

              <Field
                label="VKN / T.C. No (isteğe bağlı — girilirse davet bu numaraya kilitlenir)"
                error={errors.vknTc?.message}
              >
                <input id="vknTc" inputMode="numeric" className="input" {...register('vknTc')} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {myKind === ORG_KIND.manufacturer && (
                  <Field label="İskonto (%)" error={errors.discountRate?.message}>
                    <input
                      id="discountRate"
                      type="number"
                      step="0.01"
                      className="input"
                      defaultValue={0}
                      {...register('discountRate')}
                    />
                  </Field>
                )}
                <Field label="Geçerlilik (gün)" error={errors.validDays?.message}>
                  <input
                    id="validDays"
                    type="number"
                    className="input"
                    defaultValue={14}
                    {...register('validDays')}
                  />
                </Field>
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                  Vazgeç
                </Button>
                <Button type="submit" loading={pending}>
                  Davet oluştur
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
