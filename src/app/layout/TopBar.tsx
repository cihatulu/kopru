import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SubscriptionRequestAction } from '@/features/counterparties';
import { TopBarIconButton } from './TopBarIconButton';

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

const BELL = 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0';
const CART = 'M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01';

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
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2.5">
        <TopBarIconButton label="Menü" onClick={onMenu} className="md:hidden">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </TopBarIconButton>

        {/*
          İki etiket de `Badge` — eskiden biri `py-1.5` siyah pill, diğeri
          `py-1` gri pill'di ve yan yana yamuk duruyorlardı.
        */}
        <Badge tone="brand">{panelLabel}</Badge>
        <Badge className="hidden sm:inline-flex">{badge}</Badge>

        {!isSubscriber && <SubscriptionRequestAction orgId={orgId} />}
      </div>

      <div className="flex items-center gap-2">
        {onAnnouncementsClick !== undefined && (
          <TopBarIconButton
            label="Duyurular ve Bildirimler"
            count={unreadAnnouncementsCount}
            onClick={onAnnouncementsClick}
          >
            <path d={BELL} />
          </TopBarIconButton>
        )}

        {onCartClick !== undefined && (
          <TopBarIconButton label="Sepetim" count={cartCount} onClick={onCartClick}>
            <path d={CART} />
          </TopBarIconButton>
        )}

        <span className="ml-1 hidden truncate text-sm font-semibold text-slate-700 sm:inline">
          {userName}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initial}
        </span>
        {/*
          Çıkış İKİNCİL. Marka mavisi sayfanın asıl eylemine ayrılmıştır;
          her ekranın sağ üstünde duran çıkış düğmesi onunla yarışmamalı.
          Eskiden siyah zeminliydi ve sayfadaki en dikkat çekici düğmeydi.
        */}
        <Button variant="secondary" size="sm" loading={loggingOut} onClick={onLogout}>
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
