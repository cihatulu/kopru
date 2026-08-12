// features/team PUBLIC YÜZEYİ (A20) — ekip yönetimi.

export { useStaff, useStaffScope } from './api/useStaff';
export {
  useCreateStaff,
  useSetStaffRole,
  useSetStaffActive,
  useSetStaffScope,
  useUpdateStaff,
  useResetStaffPassword,
  StaffError,
} from './api/useStaffMutations';
export type { CreateStaffInput, CreateStaffResult, UpdateStaffInput } from './api/useStaffMutations';

export {
  ROLE_LABEL,
  ROLE_DESCRIPTION,
  STAFF_ERROR_MESSAGES,
  createStaffSchema,
  isEditable,
  needsScopeWarning,
} from './domain/staff';
export type { StaffMember, StaffRole, CreateStaffForm } from './domain/staff';

export { StaffTable } from './components/StaffTable';
export { StaffDialog } from './components/StaffDialog';
export { ScopeDialog } from './components/ScopeDialog';
export { ResetPasswordForm } from './components/ResetPasswordForm';
