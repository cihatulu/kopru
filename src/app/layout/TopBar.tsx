import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SubscriptionRequestAction } from '@/features/counterparties';
import { IconButton } from '@/components/ui/IconButton';
import { ChangePasswordModal } from '@/features/auth';

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
  /**
   * Bana gelen, yanıtlanmamış bağlantı isteği sayısı.
   */
  pendingConnectionsCount?: number | undefined;
  onConnectionsClick?: (() => void) | undefined;
  loggingOut: boolean;
  onMenu: () => void;
  onLogout: () => void;
}

const BELL = 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0';
const LINK =
  'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7';
const CART = 'M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01';

/** Üst çubuk: Masaüstünde geniş ve konforlu, mobilde kompakt ve taşmayan temiz yapı. */
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
  pendingConnectionsCount,
  onConnectionsClick,
  loggingOut,
  onMenu,
  onLogout,
}: Props) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  // Dışarı tıklanınca mobil kullanıcı menüsünü kapat
  useEffect(() => {
    if (!mobileUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setMobileUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileUserMenuOpen]);

  return (
    <>
      <header className="relative flex h-14 w-full max-w-full items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 md:px-6">
        {/* Sol Alan: Hamburger (Mobilde) + Başlık Rozetleri */}
        <div className="flex items-center gap-2 min-w-0">
          <IconButton label="Menü" size="md" onClick={onMenu} className="md:hidden shrink-0">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </IconButton>

          <Badge tone="brand" className="text-xs px-2.5 py-1 shrink-0 font-bold">
            {panelLabel}
          </Badge>
          <span className="hidden md:inline-flex shrink-0">
            <Badge>{badge}</Badge>
          </span>

          {!isSubscriber && <SubscriptionRequestAction orgId={orgId} />}
        </div>

        {/* Sağ Alan: İkonlar + Masaüstü Butonları / Mobil Avatar Menüsü */}
        <div className="flex items-center gap-2 shrink-0">
          {onConnectionsClick !== undefined && !!pendingConnectionsCount && (
            <IconButton
              label="Bekleyen bağlantı istekleri"
              size="md"
              count={pendingConnectionsCount}
              onClick={onConnectionsClick}
            >
              <path d={LINK} />
            </IconButton>
          )}

          {onAnnouncementsClick !== undefined && (
            <IconButton
              label="Duyurular ve Bildirimler"
              size="md"
              count={unreadAnnouncementsCount}
              onClick={onAnnouncementsClick}
            >
              <path d={BELL} />
            </IconButton>
          )}

          {onCartClick !== undefined && (
            <IconButton label="Sepetim" size="md" count={cartCount} onClick={onCartClick}>
              <path d={CART} />
            </IconButton>
          )}

          {/* MASAÜSTÜ GÖRÜNÜM (md ve üzeri ekranlar) — Tüm butonlar açık ve ferahtır */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 ml-1">
              <span className="truncate text-sm font-semibold text-slate-700 max-w-[150px] lg:max-w-[200px]">
                {userName}
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-xs">
                {initial}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
              className="gap-1.5 text-slate-700 hover:text-slate-900"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H17a2 2 0 01-2-2V7zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H16a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Şifre Değiştir</span>
            </Button>

            <Button variant="secondary" size="sm" loading={loggingOut} onClick={onLogout}>
              Çıkış Yap
            </Button>
          </div>

          {/* MOBİL GÖRÜNÜM (md altı ekranlar) — Tek avatar ikonu, dokununca mini menü */}
          <div className="relative md:hidden" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
              className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-xs focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
              aria-label="Kullanıcı menüsü"
            >
              {initial}
            </button>

            {mobileUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                  <p className="text-[11px] text-slate-500">{badge}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileUserMenuOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H17a2 2 0 01-2-2V7zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H16a2 2 0 01-2-2v-2z" />
                  </svg>
                  Şifre Değiştir
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileUserMenuOpen(false);
                    onLogout();
                  }}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && (
        <ChangePasswordModal userName={userName} onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
