import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { modesFor, portalTitle, type LoginMode, type Portal } from '../domain/portals';
import { schemaFor, sponsorConflict, type LoginForm } from '../domain/loginSchema';
import { BackLink } from './ModePicker';

interface Props {
  portal: Portal;
  mode: LoginMode;
  pending: boolean;
  errorMessage?: string | undefined;
  onBack: () => void;
  onSubmit: (values: LoginForm) => void;
}

export function LoginFormFields({
  portal,
  mode,
  pending,
  errorMessage,
  onBack,
  onSubmit,
}: Props) {
  const isAdmin = portal === 'admin';
  const isGuest = mode === 'guest' && !isAdmin;
  const meta = modesFor(portal).find((m) => m.id === mode);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schemaFor(portal, mode)),
  });

  const submit = (values: LoginForm) => {
    // Misafir kendi kendinin sponsoru olamaz — sunucu da reddeder, burada erken yakalıyoruz.
    if (isGuest && sponsorConflict({ userCode: values.userCode ?? '', ...values })) {
      setError('sponsorVkn', {
        message: 'Sponsor VKN’si kendi numaranızla aynı olamaz.',
      });
      return;
    }
    onSubmit(values);
  };

  return (
    <div>
      <BackLink onClick={onBack} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {portalTitle(portal)}
      </h1>
      {meta && <p className="mt-1.5 text-sm text-slate-500">{meta.title}</p>}

      <form onSubmit={(e) => void handleSubmit(submit)(e)} className="mt-8 space-y-5">
        {/* Misafir girişinde ilk alan sponsorun VKN'sidir: kim tarafından eklendiğini
            kanıtlar. Bu bir kolaylık değil, kimlik faktörüdür. */}
        {isGuest && meta?.sponsorLabel && (
          <div>
            <label className="label" htmlFor="sponsorVkn">
              {meta.sponsorLabel}
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

        {isAdmin ? (
          <div>
            <label className="label" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="ekip@kopru.com"
              className="input"
              {...register('email')}
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="userCode">
              Kullanıcı kodu (VKN / T.C. No)
            </label>
            <input
              id="userCode"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Vergi veya T.C. Kimlik numaranız"
              className="input"
              {...register('userCode')}
            />
            {errors.userCode && <p className="field-error">{errors.userCode.message}</p>}
          </div>
        )}

        <div>
          <label className="label" htmlFor="password">
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

        <Button type="submit" loading={pending} className="w-full">
          Giriş yap
        </Button>
      </form>
    </div>
  );
}
