import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SubscriptionRequestAction } from '@/features/counterparties';
import { IconButton } from '@/components/ui/IconButton';

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
   *
   * Zile EKLENMEZ, kendi ikonunu alır: zil Duyurular sayfasına gider,
   * bağlantı isteği başka bir sayfada yanıtlanır. Tek sayaçta toplamak
   * kullanıcıyı yanlış sayfaya götürürdü. Kenar çubuğunda da rozeti var
   * ama mobilde menü gizli olduğu için üst çubukta da durması gerekiyor.
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
  pendingConnectionsCount,
  onConnectionsClick,
  loggingOut,
  onMenu,
  onLogout,
}: Props) {
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2.5">
        <IconButton label="Menü" size="md" onClick={onMenu} className="md:hidden">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </IconButton>

        {/*
          İki etiket de `Badge` — eskiden biri `py-1.5` siyah pill, diğeri
          `py-1` gri pill'di ve yan yana yamuk duruyorlardı.
        */}
        <Badge tone="brand">{panelLabel}</Badge>
        <Badge className="hidden sm:inline-flex">{badge}</Badge>

        {!isSubscriber && <SubscriptionRequestAction orgId={orgId} />}
      </div>

      <div className="flex items-center gap-2">
        {/* Yalnız bekleyen istek varken çizilir — boş bir ikon gürültüdür. */}
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
