import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toBounds, type Period } from '../domain/period';
import { toEntry, type LedgerEntry } from '../domain/ledgerEntry';
import { TX_COLUMNS } from './useAccounts';

/**
 * Dışa aktarımda tek seferde çekilecek en fazla satır.
 *
 * Sınır ZORUNLU: yıllarca işlem görmüş bir cari on binlerce satır olabilir ve
 * sınırsız bir indirme hem tarayıcıyı hem PostgREST'i zorlar. Sınıra
 * dayanıldığında kullanıcı UYARILIR — sessizce kesilmiş bir ekstre, mutabakat
 * için kullanıldığında yanlış sonuç verir.
 */
export const EXPORT_LIMIT = 5000;

export interface ExportResult {
  entries: LedgerEntry[];
  /** Sınıra dayanıldı: ekstre eksik olabilir. */
  truncated: boolean;
}

/**
 * Dönemin TÜM hareketlerini çeker.
 *
 * Ekrandaki sayfalı listeden bağımsızdır: kullanıcı yalnız ilk sayfayı görmüş
 * olsa bile dosya dönemin tamamını içermelidir.
 */
export function useLedgerExport() {
  return useMutation({
    mutationFn: async ({
      relationshipId,
      period,
    }: {
      relationshipId: string;
      period: Period;
    }): Promise<ExportResult> => {
      const bounds = toBounds(period);

      let q = supabase
        .from('transactions')
        .select(TX_COLUMNS)
        .eq('relationship_id', relationshipId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(EXPORT_LIMIT);

      if (bounds.from) q = q.gte('created_at', bounds.from);
      if (bounds.to) q = q.lt('created_at', bounds.to);

      const { data, error } = await q;
      if (error) throw error;

      const entries = (data ?? []).map(toEntry);
      return { entries, truncated: entries.length >= EXPORT_LIMIT };
    },
  });
}
