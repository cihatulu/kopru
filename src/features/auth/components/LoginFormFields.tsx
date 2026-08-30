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
  const [userType, setUserType] = useState<'owner' | 'staff' | null>('owner');

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
    <form onSubmit={(e) => void handleSubmit(submit)(e)} className="space-y-3 sm:space-y-4 text-left">
      <p className="text-center text-xs font-medium text-slate-500 mb-0.5">{tab.hint}</p>

      {guest && tab.sponsorLabel && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="sponsorVkn">
            {tab.sponsorLabel}
          </label>
          <input
            id="sponsorVkn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="10 haneli vergi numarası"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all shadow-xs"
            {...register('sponsorVkn')}
          />
          {errors.sponsorVkn && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.sponsorVkn.message}</p>}
        </div>
      )}

      {email ? (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="admin@ornek.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all shadow-xs"
            {...register('email')}
          />
          {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.email.message}</p>}
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="userCode">
              Vergi No / Kullanıcı Kodu
            </label>
            <input
              id="userCode"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Vergi numaranız veya T.C. kimlik numaranız"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all shadow-xs"
              {...register('userCode')}
            />
            {errors.userCode && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.userCode.message}</p>}
          </div>

          {/* Yetkili / Personel Seçim Alanı — Modern Segmented Switch */}
          <div className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1 shadow-inner">
            <label
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all duration-200 select-none ${
                userType === 'owner'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="userType"
                value="owner"
                checked={userType === 'owner'}
                onChange={() => {
                  setUserType('owner');
                  clearErrors('root');
                }}
                className="sr-only"
              />
              <svg className={`size-3.5 ${userType === 'owner' ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Yetkili Girişi</span>
            </label>

            <label
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all duration-200 select-none ${
                userType === 'staff'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="userType"
                value="staff"
                checked={userType === 'staff'}
                onChange={() => {
                  setUserType('staff');
                  clearErrors('root');
                }}
                className="sr-only"
              />
              <svg className={`size-3.5 ${userType === 'staff' ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Personel Girişi</span>
            </label>
          </div>
          {errors.root?.message && <p className="mt-1.5 text-xs font-semibold text-red-600 text-center">{errors.root.message}</p>}
        </>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="password">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all shadow-xs"
          {...register('password')}
        />
        {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.password.message}</p>}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm"
        >
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={!email && !userType}
        className="w-full py-3.5 text-sm font-black rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
      >
        Giriş Yap
      </Button>
    </form>
  );
}
