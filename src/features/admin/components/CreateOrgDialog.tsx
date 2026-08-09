import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { ORG_KIND, type OrgKind } from '@/constants';
import { createOrgSchema, type CreateOrgForm } from '../domain/orgSchema';

interface Props {
  kind: OrgKind;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: CreateOrgForm) => void;
}

export function CreateOrgDialog({ kind, pending, errorMessage, onClose, onSubmit }: Props) {
  const noun = kind === ORG_KIND.manufacturer ? 'Üretici' : 'Perakendeci';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgForm>({ resolver: zodResolver(createOrgSchema) });

  return (
    <Modal
      label={`${noun} oluştur`}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">{noun} oluştur</h2>
      <p className="mt-1 text-sm text-slate-500">
        Kayıt <strong>misafir</strong> olarak açılır. Aboneye yükseltme ayrı bir adımdır.
      </p>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-5 space-y-4">
        <Field label="Firma adı" error={errors.companyName?.message}>
          <input className="input" autoFocus {...register('companyName')} />
        </Field>

        <Field label="VKN / T.C. No" error={errors.vknTc?.message}>
          <input className="input" inputMode="numeric" {...register('vknTc')} />
        </Field>

        <Field label="Yetkili adı" error={errors.authorizedName?.message}>
          <input className="input" {...register('authorizedName')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefon" error={errors.phone?.message}>
            <input className="input" {...register('phone')} />
          </Field>
          <Field label="E-posta" error={errors.email?.message}>
            <input className="input" {...register('email')} />
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
            Oluştur
          </Button>
        </div>
      </form>
    </Modal>
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
