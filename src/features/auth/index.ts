// features/auth PUBLIC YÜZEYİ (A20).
// Dışarıdan yalnız buradan import edilir; api/, domain/, components/ içine
// doğrudan erişim ESLint ve guard-write hook'u tarafından bloklanır.

export { useAuthSession, useAuthListener } from './api/useAuthSession';
export type { SessionUser, SessionOrg } from './api/useAuthSession';
export { useLogin, useLogout, LoginError } from './api/useLogin';
export type { LoginRequest } from './api/useLogin';

export { LOGIN_TABS, tabById, usesEmail, isGuestTab } from './domain/portals';
export type { Portal, LoginMode, LoginTab, TabId } from './domain/portals';
export { schemaFor, sponsorConflict } from './domain/loginSchema';
export type { LoginForm } from './domain/loginSchema';

export { LoginTabs } from './components/LoginTabs';
export { LoginFormFields } from './components/LoginFormFields';
