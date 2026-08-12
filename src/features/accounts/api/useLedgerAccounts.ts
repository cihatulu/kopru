import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { AccountRow } from '../domain/accountView';

/**
 * Cari Hesaplar listesi — her aktif ilişki için toplamlar ve güncel bakiye.
 *
 * Tek RPC: ilişki başına ayrı sorgu yapılsaydı 50 bayilik bir üretici için 50
 * istek giderdi. Bakiye SUM ile değil, son satırın `balance_after` değeriyle
 * okunur (A18).
 */
export function useLedgerAccounts() {
  return useQuery({
    queryKey: ['accounts', 'list'],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<AccountRow[]> => {
      // Parametresiz RPC: `rpcArgs({})` üretilen tiplerde `undefined` bekleyen
      // imzaya uymuyor.
      const { data, error } = await supabase.rpc('ledger_accounts_for_me');
      if (error) throw error;

      return (data ?? []).map((raw) => {
        const r = raw as Record<string, unknown>;
        return {
          relationshipId: String(r.relationship_id),
          counterpartyOrgId: String(r.counterparty_org_id),
          companyName: (r.company_name as string | null) ?? '—',
          vknTc: (r.vkn_tc as string | null) ?? '',
          totalDebit: Number(r.total_debit ?? 0),
          totalCredit: Number(r.total_credit ?? 0),
          balance: Number(r.balance ?? 0),
          counterpartyIsSubscriber: Boolean(r.counterparty_is_subscriber),
        };
      });
    },
  });
}
