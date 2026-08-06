import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BrandPanel,
  LoginError,
  LoginFormFields,
  ModePicker,
  PortalPicker,
  useAuthSession,
  useLogin,
  type LoginForm,
  type LoginMode,
  type Portal,
} from '@/features/auth';
import { PageLoader } from '@/components/ui/PageLoader';
import { roleHomePath } from '@/app/roleHome';

/**
 * Giriş ekranı — YALNIZ KOMPOZİSYON (A20).
 *
 * Akış: üç portal butonu → iki giriş yolu → form.
 * Açılışta hiçbir input görünmez; bir portala basılmadan o tarafın alanları gelmez.
 */
export default function LoginPage() {
  const { data: user, isLoading } = useAuthSession();
  const login = useLogin();

  const [portal, setPortal] = useState<Portal | null>(null);
  const [mode, setMode] = useState<LoginMode | null>(null);

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={roleHomePath(user)} replace />;

  const selectPortal = (next: Portal) => {
    login.reset();
    setPortal(next);
    // Adminin mod seçimi yoktur; doğrudan forma geçer.
    setMode(next === 'admin' ? 'subscriber' : null);
  };

  const selectMode = (next: LoginMode) => {
    login.reset();
    setMode(next);
  };

  const back = () => {
    login.reset();
    if (portal !== 'admin' && mode) setMode(null);
    else {
      setPortal(null);
      setMode(null);
    }
  };

  const submit = (values: LoginForm) => {
    if (!portal || !mode) return;
    login.mutate({
      portal,
      mode,
      userCode: values.userCode,
      sponsorVkn: values.sponsorVkn,
      email: values.email,
      password: values.password ?? '',
    });
  };

  const errorMessage =
    login.error instanceof LoginError ? login.error.message : login.isError
      ? 'Giriş bilgileri hatalı.'
      : undefined;

  return (
    <main className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 sm:p-8">
        <div className="w-full max-w-[380px]">
          {!portal && <PortalPicker onSelect={selectPortal} />}

          {portal && !mode && (
            <ModePicker portal={portal} onSelect={selectMode} onBack={back} />
          )}

          {portal && mode && (
            <LoginFormFields
              portal={portal}
              mode={mode}
              pending={login.isPending}
              errorMessage={errorMessage}
              onBack={back}
              onSubmit={submit}
            />
          )}
        </div>
      </div>
    </main>
  );
}
