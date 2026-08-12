import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  LoginError,
  LoginFormFields,
  LoginTabs,
  tabById,
  useAuthSession,
  useLogin,
  type LoginForm,
  type TabId,
} from '@/features/auth';
import { PageLoader } from '@/components/ui/PageLoader';
import { roleHomePath } from '@/app/roleHome';

/**
 * Giriş ekranı — YALNIZ KOMPOZİSYON (A20).
 *
 * Beş sekme: üye üretici, üye perakendeci, misafir üretici, misafir perakendeci,
 * admin. Sekme yalnızca sunum; sunucuya giden portal+mode çifti değişmedi.
 */
export default function LoginPage() {
  const { data: user, isLoading } = useAuthSession();
  const login = useLogin();
  const [tabId, setTabId] = useState<TabId>('member-manufacturer');

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={roleHomePath(user)} replace />;

  const tab = tabById(tabId);

  const submit = (values: LoginForm & { userType?: 'owner' | 'staff' }) => {
    // Boş alanlar isteğe HİÇ konmaz: sunucu "alan yok" ile "alan var ama boş"
    // arasında ayrım yapıyor (misafir sekmesinde sponsor VKN zorunlu).
    login.mutate({
      portal: tab.portal,
      mode: tab.mode,
      password: values.password ?? '',
      userType: values.userType,
      ...(values.userCode ? { userCode: values.userCode } : {}),
      ...(values.sponsorVkn ? { sponsorVkn: values.sponsorVkn } : {}),
      ...(values.email ? { email: values.email } : {}),
    });
  };

  const errorMessage =
    login.error instanceof LoginError
      ? login.error.message
      : login.isError
        ? 'Giriş bilgileri hatalı.'
        : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4">
      <p className="mb-5 text-center text-sm font-medium text-slate-400">
        Mobilya operasyon yönetim platformu
      </p>

      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <LoginTabs
          active={tabId}
          onSelect={(id) => {
            setTabId(id);
            login.reset();
          }}
        />

        <div className="px-8 py-7">
          {/* key: sekme değişince form durumu sıfırlanır, önceki alanlar taşınmaz. */}
          <LoginFormFields
            key={tabId}
            tab={tab}
            pending={login.isPending}
            errorMessage={errorMessage}
            onSubmit={submit}
          />
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-600">© 2026 KÖPRÜ</p>
    </main>
  );
}
