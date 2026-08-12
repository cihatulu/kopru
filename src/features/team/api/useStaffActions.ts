import { useState } from 'react';
import { useCreateStaff } from './useCreateStaff';
import {
  useUpdateStaff,
  useResetStaffPassword,
  useSetStaffActive,
  useSetStaffScope,
} from './useStaffMutations';
import type { StaffMember } from '../domain/staff';

export interface StaffFormValues {
  fullName: string;
  userCode: string;
  email: string;
  phone: string;
  password?: string;
  assignedRetailerIds: string[];
}

export interface CreatedStaffInfo {
  fullName: string;
  vkn: string;
  password?: string | undefined;
}

/**
 * TeamPage'in iş mantığı — sayfa yalnız kompozisyon kalsın diye burada (A20).
 * Personel oluşturma/güncelleme ile bayi kapsamı ataması zincirlenir:
 * kapsam yalnız asıl işlem başarılı olduktan sonra yazılır.
 *
 * `myVkn` çağıran tarafından verilir; personelin giriş kodu org'un VKN'sidir.
 */
export function useStaffActions(myVkn: string) {
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const resetPassword = useResetStaffPassword();
  const setActive = useSetStaffActive();
  const setScope = useSetStaffScope();

  const [createdStaffInfo, setCreatedStaffInfo] = useState<CreatedStaffInfo | null>(null);

  const addStaff = (values: StaffFormValues, onDone: () => void) => {
    create.mutate(
      {
        fullName: values.fullName,
        userCode: values.userCode,
        password: values.password || '',
        role: 'staff',
        // exactOptionalPropertyTypes: boş alan hiç gönderilmez, undefined atanmaz.
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
      },
      {
        onSuccess: (result) => {
          setScope.mutate(
            { staffUserId: result.userId, retailerOrgIds: values.assignedRetailerIds },
            {
              onSuccess: () => {
                onDone();
                create.reset();
                setCreatedStaffInfo({
                  fullName: values.fullName,
                  vkn: myVkn,
                  password: values.password,
                });
              },
            },
          );
        },
      },
    );
  };

  const editStaff = (staff: StaffMember, values: StaffFormValues, onDone: () => void) => {
    update.mutate(
      {
        userId: staff.id,
        fullName: values.fullName,
        userCode: values.userCode,
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
        // Rol korunur. 'owner' güncellenebilir rol değil — hiç gönderilmez.
        ...(staff.role === 'owner' ? {} : { role: staff.role }),
      },
      {
        onSuccess: () => {
          setScope.mutate(
            { staffUserId: staff.id, retailerOrgIds: values.assignedRetailerIds },
            {
              onSuccess: () => {
                update.reset();
                onDone();
              },
            },
          );
        },
      },
    );
  };

  const changePassword = (userId: string, newPassword: string, onDone: () => void) => {
    resetPassword.mutate(
      { userId, newPassword },
      {
        onSuccess: () => {
          resetPassword.reset();
          onDone();
        },
      },
    );
  };

  /** Soft delete (kural 16) — kayıt silinmez, pasife çekilir. */
  const deactivate = (userId: string, onDone: () => void) => {
    setActive.mutate({ userId, isActive: false }, { onSuccess: onDone });
  };

  const isPending =
    create.isPending ||
    update.isPending ||
    resetPassword.isPending ||
    setActive.isPending ||
    setScope.isPending;

  return {
    addStaff,
    editStaff,
    changePassword,
    deactivate,
    isPending,
    createdStaffInfo,
    clearCreatedStaffInfo: () => setCreatedStaffInfo(null),
  };
}
