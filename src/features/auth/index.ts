// features/auth PUBLIC YÜZEYİ (A20).
// Dışarıdan yalnız buradan import edilir; api/, domain/, components/ içine
// doğrudan erişim ESLint ve guard-write hook'u tarafından bloklanır.

export { useAuthSession, useAuthListener } from './api/useAuthSession';
export type { SessionUser, SessionOrg } from './api/useAuthSession';
export { useLogin, useLogout, LoginError } from './api/useLogin';
export type { LoginRequest } from './api/useLogin';

export { PORTALS, MODES, modesFor, portalTitle } from './domain/portals';
export type { Portal, LoginMode, PortalMeta, ModeMeta } from './domain/portals';
export { schemaFor, sponsorConflict } from './domain/loginSchema';
export type { LoginForm } from './domain/loginSchema';

export { PortalPicker } from './components/PortalPicker';
export { ModePicker } from './components/ModePicker';
export { LoginFormFields } from './components/LoginFormFields';
export { BrandPanel } from './components/BrandPanel';
