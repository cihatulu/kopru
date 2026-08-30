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
import { LeadApplicationModal } from '@/features/leads';
import { PageLoader } from '@/components/ui/PageLoader';
import { roleHomePath } from '@/app/roleHome';
import type { OrgKind } from '@/constants';

/**
 * Giriş ekranı — YALNIZ KOMPOZİSYON (A20).
 *
 * Beş sekme: üye üretici, üye perakendeci, misafir üretici, misafir perakendeci,
 * admin. Sağ ve sol tarafta yeni üyelik başvuru kartları yer alır.
 */
export default function LoginPage() {
  const { data: user, isLoading } = useAuthSession();
  const login = useLogin();
  const [tabId, setTabId] = useState<TabId>('member-manufacturer');
  const [applyKind, setApplyKind] = useState<OrgKind | null>(null);

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={roleHomePath(user)} replace />;

  const tab = tabById(tabId);

  const submit = (values: LoginForm & { userType?: 'owner' | 'staff' }) => {
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
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#090D16] px-4 py-10 overflow-hidden font-sans">
      {/* Arka plan ortam ışığı (Ambient Glow) */}
      <div className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[500px] rounded-full bg-emerald-600/10 blur-[130px]" />

      {/* Üst Logo ve Marka Başlığı */}
      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-slate-300 shadow-inner backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          B2B Mobilya Ekosistemi
        </div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            KÖPRÜ
          </span>
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-400">
          Mobilya operasyon, katalog ve sipariş yönetim platformu
        </p>
      </div>

      {/* 3 Kolonlu Vitrin Izgarası */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch">
        
        {/* Sol Taraf: Üye Üretici Başvuru Kartı */}
        <div className="relative group flex w-full max-w-sm lg:w-72 xl:w-80 flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-7 text-left shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-blue-500/10 hover:-translate-y-1">
          <div className="pointer-events-none absolute -top-10 -left-10 size-28 rounded-full bg-blue-600/15 blur-2xl" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-inner">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                Fabrika & Atölye
              </span>
            </div>

            <h2 className="text-lg font-black text-white leading-snug">
              Üye Üretici olmak ister misiniz?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Kendi mobilya markanızı dijitalleştirin, bayilerinizden anında sipariş toplayın ve fabrikanızı büyütün.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Sınırsız Dijital Ürün Kataloğu</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Anlık Bayi Siparişleri & Cari Takip</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Fuar & WhatsApp ile Müşteri Bağlama</span>
              </li>
            </ul>
          </div>

          <div className="mt-7">
            <button
              type="button"
              onClick={() => setApplyKind('manufacturer')}
              className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-900/40 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
            >
              <span>Üretici Olarak Katıl</span>
              <span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
            </button>
          </div>
        </div>

        {/* Orta: Giriş Formu Kartı */}
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10 transition-all">
          <LoginTabs
            active={tabId}
            onSelect={(id) => {
              setTabId(id);
              login.reset();
            }}
          />

          <div className="px-6 sm:px-8 py-7">
            <LoginFormFields
              key={tabId}
              tab={tab}
              pending={login.isPending}
              errorMessage={errorMessage}
              onSubmit={submit}
            />
          </div>
        </div>

        {/* Sağ Taraf: Üye Perakendeci Başvuru Kartı */}
        <div className="relative group flex w-full max-w-sm lg:w-72 xl:w-80 flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-7 text-left shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 hover:-translate-y-1">
          <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-emerald-600/15 blur-2xl" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Mağaza & Showroom
              </span>
            </div>

            <h2 className="text-lg font-black text-white leading-snug">
              Üye Perakendeci olmak ister misiniz?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Yüzlerce üretici kataloğuna tek tıkla erişin, özel toptan iskontolarla sipariş verin ve finansınızı yönetin.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Tüm Fabrikaların Güncel Kataloğu</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Özel İskontolar & Sepetten Sipariş</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Cari Hesap, SSH & Sevkiyat Takibi</span>
              </li>
            </ul>
          </div>

          <div className="mt-7">
            <button
              type="button"
              onClick={() => setApplyKind('retailer')}
              className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95"
            >
              <span>Perakendeci Olarak Katıl</span>
              <span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
            </button>
          </div>
        </div>

      </div>

      <p className="relative z-10 mt-8 text-xs font-medium text-slate-500">© 2026 KÖPRÜ B2B Platformu</p>

      {applyKind && (
        <LeadApplicationModal
          kind={applyKind}
          onClose={() => setApplyKind(null)}
        />
      )}
    </main>
  );
}
