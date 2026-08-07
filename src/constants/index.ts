// KİLİTLİ KURAL 11 — TEK constants dosyası. Başka constants dosyası açılmaz.

/** Organizasyon tipi. Bir org ya üretici ya perakendecidir; ikisi birden olamaz (A15). */
export const ORG_KIND = {
  manufacturer: 'manufacturer',
  retailer: 'retailer',
} as const;
export type OrgKind = (typeof ORG_KIND)[keyof typeof ORG_KIND];

/** Org içi kullanıcı rolü. Platform admini org'a bağlı değildir, ayrı tabloda tutulur. */
export const ORG_ROLE = {
  owner: 'owner',
  staff: 'staff',
  accountant: 'accountant',
} as const;
export type OrgRole = (typeof ORG_ROLE)[keyof typeof ORG_ROLE];

/** Ticari ilişki durumu. `pending` = karşı taraf (abone) henüz onaylamadı. */
export const RELATIONSHIP_STATUS = {
  pending: 'pending',
  active: 'active',
  passive: 'passive',
} as const;
export type RelationshipStatus =
  (typeof RELATIONSHIP_STATUS)[keyof typeof RELATIONSHIP_STATUS];

/** Abonelik planı. Misafir org'un planı yoktur (null). */
export const PLAN = { free: 'free', basic: 'basic', pro: 'pro' } as const;
export type Plan = (typeof PLAN)[keyof typeof PLAN];

/** Plan bazlı modül erişimi — KİLİTLİ KURAL 15 gereği RLS/Edge tarafında da doğrulanır. */
export const PLAN_MODULES: Record<Plan, readonly string[]> = {
  free: ['dashboard', 'catalog', 'orders', 'accounts', 'counterparties'],
  basic: ['dashboard', 'catalog', 'orders', 'accounts', 'counterparties', 'stock', 'reports', 'announcements'],
  pro: [
    'dashboard', 'catalog', 'orders', 'accounts', 'counterparties', 'stock', 'reports',
    'announcements', 'ssh', 'returns', 'team', 'finance', 'campaigns', 'roomStaging',
  ],
} as const;

/** Misafir org'un görebileceği modüller — plandan bağımsız, sabit ve dar. */
export const GUEST_MODULES = ['dashboard', 'catalog', 'orders', 'accounts'] as const;

export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  track: '/track/:orderToken',

  admin: '/admin',
  adminManufacturers: '/admin/uretici',
  adminRetailers: '/admin/perakendeci',
  adminRelationships: '/admin/iliskiler',
  adminRequests: '/admin/talepler',
  adminLeads: '/admin/adaylar',

  manufacturer: '/m',
  retailer: '/r',
} as const;

/** Admin yalnızca bu rezerve subdomain'den giriş yapabilir. */
export const RESERVED_ADMIN_SUBDOMAIN = 'admincyo';

/** Tenant subdomain'i olarak kullanılamayacak isimler. */
export const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', RESERVED_ADMIN_SUBDOMAIN] as const;

/** Keyset pagination sayfa boyutu (A17). OFFSET kullanılmaz. */
export const PAGE_SIZE = 25;

/** react-query staleTime değerleri — her sorgu tipi açıkça belirtilir (PLAN §17.2). */
export const STALE_TIME = {
  /** Katalog/ürün: nadiren değişir. */
  catalog: 5 * 60_000,
  /** Oturum/profil. */
  session: 5 * 60_000,
  /** Sipariş/cari: realtime invalidation zaten var, kısa tut. */
  transactional: 30_000,
} as const;

export const DEFAULT_CURRENCY = 'TRY';

export const PASSWORD_MIN_LENGTH = 8;
/** En az bir harf ve bir rakam. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).+$/;

/** `login` Edge Function'ının döndürdüğü hata kodları (ERROR_PROTOCOLS #12). */
export const LOGIN_ERROR = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  noActiveRelationship: 'NO_ACTIVE_RELATIONSHIP',
  locked: 'ACCOUNT_LOCKED',
  wrongPortal: 'WRONG_PORTAL',
} as const;
