// features/team PUBLIC YÜZEYİ (A20) — ekip yönetimi.

export { useStaff, useStaffScope } from './api/useStaff';
export { useCreateStaff, StaffError } from './api/useCreateStaff';
export type { CreateStaffInput, CreateStaffResult } from './api/useCreateStaff';
export {
  useSetStaffRole,
  useSetStaffActive,
  useSetStaffScope,
  useUpdateStaff,
  useResetStaffPassword,
} from './api/useStaffMutations';
export type { UpdateStaffInput } from './api/useStaffMutations';
export { useStaffActions } from './api/useStaffActions';
export type { StaffFormValues, CreatedStaffInfo } from './api/useStaffActions';

export {
  ROLE_LABEL,
  ROLE_DESCRIPTION,
  STAFF_ERROR_MESSAGES,
  createStaffSchema,
  isEditable,
  needsScopeWarning,
  validateStaffForm,
} from './domain/staff';
export type { StaffMember, StaffRole, CreateStaffForm } from './domain/staff';

export { StaffTable } from './components/StaffTable';
export { StaffDialog } from './components/StaffDialog';
export { ScopeDialog } from './components/ScopeDialog';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { StaffCreatedDialog } from './components/StaffCreatedDialog';
export { DeleteStaffConfirm } from './components/DeleteStaffConfirm';
