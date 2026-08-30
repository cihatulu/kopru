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
    <main
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      className="relative flex min-h-[100dvh] h-full flex-col items-center justify-between sm:justify-center bg-slate-100/70 px-3 py-2.5 sm:px-6 sm:py-6 overflow-y-auto no-scrollbar font-sans select-none"
    >
      {/* Arka plan yumuşak ortam ışığı */}
      <div className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[500px] rounded-full bg-emerald-400/10 blur-[130px]" />

      {/* Üst Logo ve Marka Başlığı */}
      <div className="relative z-10 mb-2 sm:mb-4 text-center shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-md">
          <span className="size-1.5 sm:size-2 rounded-full bg-emerald-500 animate-pulse" />
          B2B Mobilya Ekosistemi
        </div>
        <h1 className="mt-1 sm:mt-1.5 text-2xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
          <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
            KÖPRÜ
          </span>
        </h1>
      </div>

      {/* Dikey Hizalı Giriş & Başvuru Kolonu (Web ve Mobil Uyumlu) */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-center gap-2 sm:gap-3.5 mx-auto">
        
        {/* Üst: Üye Üretici Başvuru Butonu & Akordeonu */}
        <div className="w-full flex flex-col rounded-2xl border border-blue-200/80 bg-white shadow-sm overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => {
              const next = !openManufacturer;
              setOpenManufacturer(next);
              if (next) setOpenRetailer(false);
            }}
            className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left font-black text-xs sm:text-sm text-blue-700 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-50/90 transition-colors cursor-pointer select-none"
          >
            <span>MOBİLYA ÜRETİCİSİYSEN TIKLA!</span>
            <svg
              className={`size-4 text-blue-600 transition-transform duration-200 shrink-0 ${
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
            <div className="p-3 sm:p-4 border-t border-slate-100 text-left bg-white animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs leading-relaxed text-slate-600 font-medium">
                Kendi mobilya markanızı dijitalleştirin, bayilerinizden anında sipariş toplayın ve fabrikanızı büyütün.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-slate-700 font-semibold">
                <li className="flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Sınırsız Dijital Ürün Kataloğu</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Anlık Bayi Siparişleri & Cari Takip</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Fuar & WhatsApp ile Müşteri Bağlama</span>
                </li>
              </ul>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setApplyKind('manufacturer')}
                  className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-95"
                >
                  <span>Üretici Olarak Katıl</span>
                  <span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orta: Giriş Formu Kartı */}
        <div className="w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-lg shadow-slate-200/70 border border-slate-200/80 transition-all">
          <LoginTabs
            active={tabId}
            onSelect={(id) => {
              setTabId(id);
              login.reset();
            }}
          />

          <div className="px-4 py-3 sm:px-8 sm:py-5">
            <LoginFormFields
              key={tabId}
              tab={tab}
              pending={login.isPending}
              errorMessage={errorMessage}
              onSubmit={submit}
            />
          </div>
        </div>

        {/* Alt: Üye Perakendeci Başvuru Butonu & Akordeonu */}
        <div className="w-full flex flex-col rounded-2xl border border-emerald-200/80 bg-white shadow-sm overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => {
              const next = !openRetailer;
              setOpenRetailer(next);
              if (next) setOpenManufacturer(false);
            }}
            className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left font-black text-xs sm:text-sm text-emerald-700 hover:text-emerald-800 bg-emerald-50/60 hover:bg-emerald-50/90 transition-colors cursor-pointer select-none"
          >
            <span>MOBİLYA MAĞAZASIYSAN TIKLA!</span>
            <svg
              className={`size-4 text-emerald-600 transition-transform duration-200 shrink-0 ${
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
            <div className="p-3 sm:p-4 border-t border-slate-100 text-left bg-white animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs leading-relaxed text-slate-600 font-medium">
                Yüzlerce üretici kataloğuna tek tıkla erişin, özel toptan iskontolarla sipariş verin ve finansınızı yönetin.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-slate-700 font-semibold">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Tüm Fabrikaların Güncel Kataloğu</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Özel İskontolar & Sepetten Sipariş</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Cari Hesap, SSH & Sevkiyat Takibi</span>
                </li>
              </ul>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setApplyKind('retailer')}
                  className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 active:scale-95"
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
