import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useSubscriptionStatus, useRequestSubscription } from '@/features/counterparties/api/useSubscriptionRequest';

interface Props {
  panelLabel: string;
  userName: string;
  /** Misafir org'lar için rozet; abone ise plan adı. */
  badge: string;
  orgId?: string;
  isSubscriber?: boolean;
  /** Sepetteki ürün sayısı (yalnız perakendeci). */
  cartCount?: number | undefined;
  /** Sepet ikonuna tıklanınca çağrılır. */
  onCartClick?: (() => void) | undefined;
  /** Okunmamış duyuru/bildirim sayısı. */
  unreadAnnouncementsCount?: number | undefined;
  /** Duyuru/bildirim ikonuna tıklanınca çağrılır. */
  onAnnouncementsClick?: (() => void) | undefined;
  loggingOut: boolean;
  onMenu: () => void;
  onLogout: () => void;
}

/** Üst çubuk: panel rozeti, sepet ikonu (perakendeci), kullanıcı ve çıkış. */
export function TopBar({
  panelLabel,
  userName,
  badge,
  orgId,
  isSubscriber = true,
  cartCount,
  onCartClick,
  unreadAnnouncementsCount,
  onAnnouncementsClick,
  loggingOut,
  onMenu,
  onLogout,
}: Props) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  // Subscription status check for guest orgs
  const { data: pendingReq } = useSubscriptionStatus(isSubscriber ? undefined : orgId);
  const requestSub = useRequestSubscription();

  const handleConfirmRequest = async () => {
    try {
      setErrorMsg(null);
      await requestSub.mutateAsync();
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('[handleConfirmRequest] error:', err);
      setErrorMsg(err.message || 'Abonelik talebi iletilirken bir hata oluştu.');
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Menü"
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="size-5"
          >
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <span className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
          {panelLabel}
        </span>
        <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline">
          {badge}
        </span>

        {/* Misafir Org için Admin'e Abonelik Talebi Gönderme Butonu */}
        {!isSubscriber && (
          <div className="ml-2">
            {pendingReq ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Üyelik Talebiniz Alındı (İnceleniyor)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setShowConfirmModal(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.24a6 6 0 0 0 2.24 2.24m0 0a6 6 0 0 0 2.24-2.24" />
                </svg>
                <span>Platforma Üye Ol (Talebi Gönder)</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Duyurular/Bildirimler ikonu */}
        {onAnnouncementsClick !== undefined && (
          <button
            type="button"
            aria-label={`Duyurular ve Bildirimler${unreadAnnouncementsCount ? ` (${unreadAnnouncementsCount} yeni)` : ''}`}
            onClick={onAnnouncementsClick}
            className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Duyurular & Bildirimler"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadAnnouncementsCount != null && unreadAnnouncementsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                {unreadAnnouncementsCount > 99 ? '99+' : unreadAnnouncementsCount}
              </span>
            )}
          </button>
        )}

        {/* Sepet ikonu — yalnız perakendeci */}
        {onCartClick !== undefined && (
          <button
            type="button"
            aria-label={`Sepetim${cartCount ? ` (${cartCount} ürün)` : ''}`}
            onClick={onCartClick}
            className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <path d="M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01" />
            </svg>
            {cartCount != null && cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        )}

        <span className="hidden truncate text-sm font-semibold uppercase text-slate-700 sm:inline">
          {userName}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {initial}
        </span>
        <Button loading={loggingOut} onClick={onLogout} className="bg-slate-900 hover:bg-slate-800">
          Çıkış Yap
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                🚀
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Platform Abonesi Ol</h3>
                <p className="text-xs text-slate-500">Platform yönetimine üyelik talebi iletme</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              KÖPRÜ Platform abonesi olarak tüm modüllere erişim ve üyelik aktivasyon talebinizi Admin yönetimine iletmek üzeresiniz.
              <br />
              <span className="font-extrabold text-blue-600 mt-2 block text-xs">
                Platform Adminine üyelik talebini göndermek istediğinizden emin misiniz?
              </span>
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={requestSub.isPending}>
                İptal
              </Button>
              <Button
                loading={requestSub.isPending}
                onClick={handleConfirmRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
              >
                Evet, Talebi Gönder
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
