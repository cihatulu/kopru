import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useLedger } from '../api/useAccounts';
import { useLedgerSummary } from '../api/useLedgerSummary';
import { useLedgerExport } from '../api/useLedgerExport';
import { EMPTY_PERIOD, type Period } from '../domain/period';
import { ledgerFileName, ledgerToCsv } from '../domain/ledgerCsv';
import { filterEntries } from '../domain/accountView';
import { LedgerTable } from './LedgerTable';
import { PeriodBar } from './PeriodBar';

interface Props {
  relationshipId: string;
  counterpartyName: string;
  isManufacturer: boolean;
  canWrite?: boolean;
}

/**
 * Hesap detayının sol sütunu: dönem, özet, arama, ekstre, dışa aktarım.
 *
 * Diyalogdan ayrı bir dosya — ikisi bir arada 200 satır bütçesini aşardı (A19).
 */
export function LedgerSection({
  relationshipId,
  counterpartyName,
  isManufacturer,
  canWrite = true,
}: Props) {
  const [period, setPeriod] = useState<Period>(EMPTY_PERIOD);
  const [search, setSearch] = useState('');

  const ledger = useLedger(relationshipId);
  const summary = useLedgerSummary(relationshipId, period);
  const exportLedger = useLedgerExport();

  const entries = ledger.data?.pages.flat() ?? [];

  const download = () => {
    exportLedger.mutate(
      { relationshipId, period },
      {
        onSuccess: ({ entries: all }) => {
          const csv = ledgerToCsv(all, summary.data ?? null, counterpartyName);
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = ledgerFileName(counterpartyName);
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  };

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Ekstrede ara</span>
          <input
            className="input"
            placeholder="Sipariş no veya açıklama ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Button variant="secondary" loading={exportLedger.isPending} onClick={download}>
          Excel'e Aktar
        </Button>
      </div>

      <PeriodBar period={period} onChange={setPeriod} />

      {exportLedger.data?.truncated && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ekstre çok uzun olduğu için dosya kesildi. Daha dar bir tarih aralığı seçip tekrar indirin
          — eksik bir ekstre mutabakatta yanlış sonuç verir.
        </p>
      )}

      {ledger.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LedgerTable
          entries={filterEntries(entries, search)}
          counterpartyName={counterpartyName}
          isManufacturer={isManufacturer}
          canWrite={canWrite}
        />
      )}

      {search.trim() !== '' && ledger.hasNextPage && (
        <p className="text-xs text-slate-500">
          Arama yalnız yüklenmiş hareketlerde çalışır; eski kayıtlar için önce “Daha fazla yükle”.
        </p>
      )}

      {ledger.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={ledger.isFetchingNextPage}
            onClick={() => void ledger.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}
    </div>
  );
}
