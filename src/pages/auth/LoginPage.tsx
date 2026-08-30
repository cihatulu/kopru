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
  const [openManufacturer, setOpenManufacturer] = useState(false);
  const [openRetailer, setOpenRetailer] = useState(false);

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
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#090D16] px-3 py-3 sm:px-6 sm:py-8 overflow-x-hidden font-sans">
      {/* Arka plan ortam ışığı (Ambient Glow) */}
      <div className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[500px] rounded-full bg-emerald-600/10 blur-[130px]" />

      {/* Üst Logo ve Marka Başlığı */}
      <div className="relative z-10 mb-3 sm:mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-300 shadow-inner backdrop-blur-md">
          <span className="size-1.5 sm:size-2 rounded-full bg-emerald-400 animate-pulse" />
          B2B Mobilya Ekosistemi
        </div>
        <h1 className="mt-1.5 sm:mt-2.5 text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            KÖPRÜ
          </span>
        </h1>
        <p className="mt-0.5 text-[11px] sm:text-sm font-medium text-slate-400">
          Mobilya operasyon, katalog ve sipariş yönetim platformu
        </p>
      </div>

      {/* 3 Kolonlu Vitrin Izgarası */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-3 sm:gap-5 lg:flex-row lg:items-start">
        
        {/* Sol Taraf: Üye Üretici Başvuru Butonu & Akordeonu */}
        <div className="w-full max-w-lg lg:w-72 xl:w-80 flex flex-col rounded-2xl border border-blue-500/20 bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setOpenManufacturer(!openManufacturer)}
            className="w-full p-2.5 sm:p-4 flex items-center justify-between text-left font-black text-xs sm:text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 transition-colors cursor-pointer select-none"
          >
            <span>MOBİLYA ÜRETİCİSİYSEN TIKLA!</span>
            <svg
              className={`size-4 text-blue-400 transition-transform duration-200 shrink-0 ${
                openManufacturer ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openManufacturer && (
            <div className="p-4 sm:p-5 border-t border-white/10 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs leading-relaxed text-slate-300">
                Kendi mobilya markanızı dijitalleştirin, bayilerinizden anında sipariş toplayın ve fabrikanızı büyütün.
              </p>

              <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs text-slate-300">
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

              <div className="mt-4 sm:mt-5">
                <button
                  type="button"
                  onClick={() => setApplyKind('manufacturer')}
                  className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-blue-900/40 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                >
                  <span>Üretici Olarak Katıl</span>
                  <span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
                </button>
              </div>
            </div>
          )}
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

          <div className="px-5 py-4 sm:px-8 sm:py-6">
            <LoginFormFields
              key={tabId}
              tab={tab}
              pending={login.isPending}
              errorMessage={errorMessage}
              onSubmit={submit}
            />
          </div>
        </div>

        {/* Sağ Taraf: Üye Perakendeci Başvuru Butonu & Akordeonu */}
        <div className="w-full max-w-lg lg:w-72 xl:w-80 flex flex-col rounded-2xl border border-emerald-500/20 bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setOpenRetailer(!openRetailer)}
            className="w-full p-2.5 sm:p-4 flex items-center justify-between text-left font-black text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors cursor-pointer select-none"
          >
            <span>MOBİLYA MAĞAZASIYSAN TIKLA!</span>
            <svg
              className={`size-4 text-emerald-400 transition-transform duration-200 shrink-0 ${
                openRetailer ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openRetailer && (
            <div className="p-4 sm:p-5 border-t border-white/10 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs leading-relaxed text-slate-300">
                Yüzlerce üretici kataloğuna tek tıkla erişin, özel toptan iskontolarla sipariş verin ve finansınızı yönetin.
              </p>

              <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs text-slate-300">
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

              <div className="mt-4 sm:mt-5">
                <button
                  type="button"
                  onClick={() => setApplyKind('retailer')}
                  className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95"
                >
                  <span>Perakendeci Olarak Katıl</span>
                  <span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {applyKind && (
        <LeadApplicationModal
          kind={applyKind}
          onClose={() => setApplyKind(null)}
        />
      )}
    </main>
  );
}
