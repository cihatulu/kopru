import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { isGuestTab, usesEmail, type LoginTab } from '../domain/portals';
import { schemaFor, sponsorConflict, type LoginForm } from '../domain/loginSchema';

interface Props {
  tab: LoginTab;
  pending: boolean;
  errorMessage?: string | undefined;
  onSubmit: (values: LoginForm & { userType?: 'owner' | 'staff' }) => void;
}

/**
 * Aktif sekmenin formu.
 *
 * Alanlar sekmeye göre değişir ama sunucuya giden sözleşme aynıdır:
 * yalnız ADMIN e-posta ile girer; diğer herkes VERGİ NUMARASI (kullanıcı kodu)
 * ile. Misafir sekmelerinde ayrıca sponsorun vergi numarası istenir — bu bir
 * kolaylık değil, sunucuda aktif ilişkiye karşı doğrulanan kimlik faktörüdür.
 */
export function LoginFormFields({ tab, pending, errorMessage, onSubmit }: Props) {
  const email = usesEmail(tab);
  const guest = isGuestTab(tab);
  const [userType, setUserType] = useState<'owner' | 'staff' | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schemaFor(tab.portal, tab.mode)),
  });

  const submit = (values: LoginForm) => {
    if (!email && !userType) {
      setError('root', { message: 'Lütfen giriş tipini (Yetkili/Personel) seçiniz.' });
      return;
    }
    if (guest && sponsorConflict({ userCode: values.userCode ?? '', ...values })) {
      setError('sponsorVkn', { message: 'Sponsor vergi numarası kendi numaranızla aynı olamaz.' });
      return;
    }
    onSubmit({ ...values, ...(userType ? { userType } : {}) });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} className="space-y-4">
      <p className="text-center text-sm text-slate-500">{tab.hint}</p>

      {guest && tab.sponsorLabel && (
        <div>
          <label className="label uppercase tracking-wide" htmlFor="sponsorVkn">
            {tab.sponsorLabel}
          </label>
          <input
            id="sponsorVkn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="10 haneli vergi numarası"
            className="input"
            {...register('sponsorVkn')}
          />
          {errors.sponsorVkn && <p className="field-error">{errors.sponsorVkn.message}</p>}
        </div>
      )}

      {email ? (
        <div>
          <label className="label uppercase tracking-wide" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="admin@ornek.com"
            className="input"
            {...register('email')}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
      ) : (
        <>
          <div>
            <label className="label uppercase tracking-wide" htmlFor="userCode">
              Vergi No / Kullanıcı Kodu
            </label>
            <input
              id="userCode"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Vergi numaranız veya T.C. kimlik numaranız"
              className="input"
              {...register('userCode')}
            />
            {errors.userCode && <p className="field-error">{errors.userCode.message}</p>}
          </div>

          {/* Yetkili / Personel Seçim Tik Alanı */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/80 flex justify-around items-center">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="radio"
                name="userType"
                value="owner"
                checked={userType === 'owner'}
                onChange={() => {
                  setUserType('owner');
                  clearErrors('root');
                }}
                className="h-4.5 w-4.5 text-slate-800 rounded border-slate-300 focus:ring-slate-850 cursor-pointer"
              />
              <span>Yetkili Girişi</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="radio"
                name="userType"
                value="staff"
                checked={userType === 'staff'}
                onChange={() => {
                  setUserType('staff');
                  clearErrors('root');
                }}
                className="h-4.5 w-4.5 text-slate-800 rounded border-slate-300 focus:ring-slate-850 cursor-pointer"
              />
              <span>Personel Girişi</span>
            </label>
          </div>
          {errors.root?.message && <p className="field-error text-center">{errors.root.message}</p>}
        </>
      )}

      <div>
        <label className="label uppercase tracking-wide" htmlFor="password">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          {...register('password')}
        />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100"
        >
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={!email && !userType}
        className="w-full py-3"
      >
        Giriş Yap
      </Button>
    </form>
  );
}
