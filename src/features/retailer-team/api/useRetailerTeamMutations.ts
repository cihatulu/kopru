import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { edgeErrorCode } from '@/lib/edgeError';
import { STAFF_ERROR_MESSAGES } from '@/features/team/domain/staff';
import type { RetailerTeamRole } from '../domain/retailerTeam';

// ─── Üye Ekle ────────────────────────────────────────────────────────────────

interface AddMemberVars {
  orgId: string;
  fullName: string;
  email: string;
  password: string;
  role: RetailerTeamRole;
}

export function useAddRetailerMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: AddMemberVars) => {
      const { error } = (await supabase.functions.invoke('create-staff', {
        body: {
          fullName: vars.fullName,
          email: vars.email,
          password: vars.password,
          role: vars.role === 'retailer_accountant' ? 'accountant' : 'staff',
        },
      })) as { error: any };
      if (error) {
        const code = await edgeErrorCode(error);
        throw new Error(STAFF_ERROR_MESSAGES[code] ?? STAFF_ERROR_MESSAGES.DEFAULT);
      }
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['retailer-team', 'members', vars.orgId] });
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

// ─── Durum Aç/Kapat ──────────────────────────────────────────────────────────

interface ToggleMemberVars {
  id: string;
  orgId: string;
  isActive: boolean;
}

export function useToggleRetailerMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: ToggleMemberVars) => {
      const { error } = await supabase
        .from('users')
        .update({ is_active: vars.isActive })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['retailer-team', 'members', vars.orgId] });
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

// ─── Rol Güncelle ─────────────────────────────────────────────────────────────

interface UpdateRoleVars {
  id: string;
  orgId: string;
  role: RetailerTeamRole;
}

export function useUpdateRetailerMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: UpdateRoleVars) => {
      const { error } = await supabase
        .from('users')
        .update({ org_role: vars.role === 'retailer_accountant' ? 'accountant' : 'staff' })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['retailer-team', 'members', vars.orgId] });
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

// ─── Şifre Güncelle ──────────────────────────────────────────────────────────

interface UpdatePasswordVars {
  id: string;
  orgId: string;
  password?: string;
}

export function useUpdateRetailerMemberPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: UpdatePasswordVars) => {
      if (!vars.password) return;
      const { error } = (await supabase.functions.invoke('update-user-password', {
        body: {
          mode: 'staff_update',
          userId: vars.id,
          updates: { password: vars.password },
        },
      })) as { error: any };
      if (error) {
        const code = await edgeErrorCode(error);
        throw new Error(STAFF_ERROR_MESSAGES[code] ?? STAFF_ERROR_MESSAGES.DEFAULT);
      }
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['retailer-team', 'members', vars.orgId] });
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

