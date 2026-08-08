import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { acceptInviteSchema, type AcceptInviteForm as FormValues } from '../domain/inviteSchema';
import type { InvitePreview } from '../api/useInviteAcceptance';

interface Props {
  preview: InvitePreview;
  pending: boolean;
  errorMessage?: string | undefined;
  onSubmit: (values: FormValues) => void;
}

/**
 * Davet edilenin kayıt formu.
 *
 * Ön dolgu daveti gönderenin girdiği bilgilerden gelir; hepsi düzeltilebilir —
 * karşı taraf kendi firmasını bizden iyi bilir. Tek istisna VKN: davet o
 * numaraya kilitlenmişse alan salt okunur olur.
 */
export function AcceptInviteFormView({ preview, pending, errorMessage, onSubmit }: Props) {
  const vknLocked = !!preview.vknTc;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      vknTc: preview.vknTc ?? '',
      companyName: preview.companyName ?? '',
      authorizedName: preview.authorizedName ?? '',
      phone: preview.phone ?? '',
      email: preview.email ?? '',
    },
  });

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
      <Field label="VKN / T.C. Kimlik No" error={errors.vknTc?.message}>
        <input
          id="vknTc"
          inputMode="numeric"
          className="input"
          readOnly={vknLocked}
          {...register('vknTc')}
        />
        {vknLocked && (
          <p className="mt-1 text-xs text-slate-500">
            Bu davet bu numaraya özel oluşturulmuş; değiştirilemez.
          </p>
        )}
      </Field>

      <Field label="Firma adı" error={errors.companyName?.message}>
        <input id="companyName" className="input" {...register('companyName')} />
      </Field>

      <Field label="Yetkili adı" error={errors.authorizedName?.message}>
        <input id="authorizedName" className="input" {...register('authorizedName')} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon" error={errors.phone?.message}>
          <input id="phone" className="input" {...register('phone')} />
        </Field>
        <Field label="E-posta" error={errors.email?.message}>
          <input id="email" className="input" {...register('email')} />
        </Field>
      </div>

      <Field label="Şifre" error={errors.password?.message}>
        <input id="password" type="password" className="input" {...register('password')} />
      </Field>

      <Field label="Şifre (tekrar)" error={errors.passwordRepeat?.message}>
        <input
          id="passwordRepeat"
          type="password"
          className="input"
          {...register('passwordRepeat')}
        />
      </Field>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        Hesabımı oluştur
      </Button>
    </form>
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
