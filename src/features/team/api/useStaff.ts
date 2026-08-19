import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { StaffMember, StaffRole } from '../domain/staff';

interface DbUserRow {
  id: string;
  user_code: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  org_role: StaffRole;
  is_active: boolean;
  created_at: string;
  organizations: { authorized_name: string | null } | { authorized_name: string | null }[] | null;
}

/**
 * Organizasyonun ekibi.
 *
 * Ekip listesi küçüktür (org başına onlarca) — keyset sayfalamaya gerek yok,
 * `PAGE_SIZE` sınırı da yok. Yine de `select('*')` kullanılmaz.
 *
 * Kapsam sayısı AYRI sorgudan gelir: `users` üzerinden gömme yapmak
 * `staff_scope`'un kendi RLS'ini devreye sokar ve sahibin gördüğü sayı ile
 * personelin gördüğü sayı sessizce ayrışırdı.
 */
export function useStaff() {
  return useQuery({
    queryKey: ['team', 'staff'],
    staleTime: STALE_TIME.session,
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, user_code, full_name, email, phone, org_role, is_active, created_at, organizations!users_org_id_fkey(authorized_name)')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rows = (data as unknown) as DbUserRow[] ?? [];
      const ids = rows.map((r) => String(r.id));

      const scopeCounts = new Map<string, number>();
      if (ids.length > 0) {
        const { data: scopes, error: scopeError } = await supabase
          .from('staff_scope')
          .select('staff_user_id')
          .in('staff_user_id', ids);
        if (scopeError) throw scopeError;
        for (const s of scopes ?? []) {
          const key = String(s.staff_user_id);
          scopeCounts.set(key, (scopeCounts.get(key) ?? 0) + 1);
        }
      }

      return rows.map((r) => {
        const orgAuthorizedName = r.organizations 
          ? (Array.isArray(r.organizations) ? r.organizations[0]?.authorized_name : r.organizations.authorized_name) 
          : null;
        return {
          id: String(r.id),
          userCode: String(r.user_code),
          fullName: r.full_name?.trim() || (r.org_role === 'owner' ? orgAuthorizedName : null) || null,
          email: r.email ?? null,
          phone: r.phone ?? null,
          role: r.org_role,
          isActive: Boolean(r.is_active),
          createdAt: String(r.created_at),
          scopeCount: scopeCounts.get(String(r.id)) ?? 0,
        };
      });
    },
  });
}

/** Bir personelin atandığı perakendeci org id'leri. */
export function useStaffScope(staffUserId: string | null) {
  return useQuery({
    queryKey: ['team', 'scope', staffUserId],
    enabled: !!staffUserId,
    staleTime: STALE_TIME.session,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('staff_scope')
        .select('retailer_org_id')
        .eq('staff_user_id', staffUserId!);
      if (error) throw error;
      return (data ?? []).map((r) => String(r.retailer_org_id));
    },
  });
}
