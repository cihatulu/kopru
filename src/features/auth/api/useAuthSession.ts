import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME, type OrgKind, type OrgRole, type Plan } from '@/constants';

export const AUTH_SESSION_KEY = ['auth-session'] as const;

// Açık kolon listesi (kilitli kural 19) — select('*') yasak.
const SESSION_COLUMNS =
  'id, org_id, org_role, full_name, email, is_active, ' +
  'organizations!users_org_id_fkey!inner(id, kind, company_name, vkn_tc, is_subscriber, plan, created_by_org_id, ' +
  'enabled_modules, branding, subdomain, is_active)';

export interface SessionOrg {
  id: string;
  kind: OrgKind;
  companyName: string;
  vknTc: string;
  isSubscriber: boolean;
  plan: Plan | null;
  createdByOrgId: string | null;
  enabledModules: string[];
  subdomain: string | null;
}

export interface SessionUser {
  id: string;
  orgRole: OrgRole;
  fullName: string | null;
  isPlatformAdmin: boolean;
  org: SessionOrg | null;
  sponsorOrgId?: string | null;
}

async function fetchSession(): Promise<SessionUser | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // Platform admini hiçbir org'a bağlı değildir; users tablosunda satırı yoktur.
  const { data: adminRow } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (adminRow) {
    return { id: auth.user.id, orgRole: 'owner', fullName: null, isPlatformAdmin: true, org: null, sponsorOrgId: null };
  }

  const { data: row, error } = await supabase
    .from('users')
    .select(SESSION_COLUMNS)
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  // PostgREST gömme ipuçlarını (A15 bileşik FK) üretilen tipler çözemiyor ve
  // satırı hata tipine düşürüyor. Sorgunun canlıda doğru çalıştığı kanıtlı;
  // burada bilinçli olarak unknown üzerinden dönüştürüyoruz.
  const r = row as unknown as Record<string, unknown>;
  const org = r.organizations as Record<string, unknown>;
  if (!r.is_active || !org.is_active) {
    // Pasifleştirilmiş kullanıcı/org oturumu taşımaz.
    await supabase.auth.signOut();
    return null;
  }

  return {
    id: r.id as string,
    orgRole: r.org_role as OrgRole,
    fullName: (r.full_name as string | null) ?? null,
    isPlatformAdmin: false,
    org: {
      id: org.id as string,
      kind: org.kind as OrgKind,
      companyName: org.company_name as string,
      vknTc: org.vkn_tc as string,
      isSubscriber: org.is_subscriber as boolean,
      plan: (org.plan as Plan | null) ?? null,
      createdByOrgId: (org.created_by_org_id as string | null) ?? null,
      enabledModules: (org.enabled_modules as string[] | null) ?? [],
      subdomain: (org.subdomain as string | null) ?? null,
    },
    sponsorOrgId: (auth.user.app_metadata?.sponsor_org_id as string | null) ?? null,
  };
}

export function useAuthSession() {
  return useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchSession,
    staleTime: STALE_TIME.session,
  });
}

/** Auth olaylarını TEK noktadan dinler; oturum değişince cache tazelenir. */
export function useAuthListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
}
