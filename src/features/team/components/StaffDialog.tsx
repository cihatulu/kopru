import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { ROLE_DESCRIPTION, createStaffSchema, type CreateStaffForm } from '../domain/staff';
import type { CreateStaffResult } from '../api/useStaffMutations';

interface Props {
  pending: boolean;
  result: CreateStaffResult | null;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: CreateStaffForm) => void;
}

export function StaffDialog({ pending, result, errorMessage, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { role: 'staff' },
  });

  const role = watch('role') ?? 'staff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Personel ekle"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        {result ? (
          <Created result={result} onClose={onClose} />
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900">Personel ekle</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kullanıcı kodu vergi numaranızdan türetilir. Şifreyi siz belirlersiniz ve
              personele iletirsiniz.
            </p>

            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-5 space-y-4">
              <Field label="Ad soyad" error={errors.fullName?.message}>
                <input id="fullName" className="input" {...register('fullName')} />
              </Field>

              <Field label="Rol" error={errors.role?.message}>
                <select id="role" className="input" {...register('role')}>
                  <option value="staff">Personel</option>
                  <option value="accountant">Muhasebeci</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {ROLE_DESCRIPTION[role]}
                </p>
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

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                  Vazgeç
                </Button>
                <Button type="submit" loading={pending}>
                  Ekle
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Created({ result, onClose }: { result: CreateStaffResult; onClose: () => void }) {
  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">Personel eklendi</h2>
      <p className="mt-1 text-sm text-slate-500">
        Giriş için bu kullanıcı kodunu ve belirlediğiniz şifreyi iletin.
      </p>

      <div className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Kullanıcı kodu</dt>
            <dd className="font-mono font-semibold text-slate-900">{result.userCode}</dd>
          </div>
        </dl>
      </div>

      {result.role === 'staff' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          Bu personel henüz hiçbir müşteriye atanmadı ve şu an hiçbirini göremez.
          Listeden <strong>Müşteri ata</strong> ile kapsamını belirleyin.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Kapat</Button>
      </div>
    </>
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
