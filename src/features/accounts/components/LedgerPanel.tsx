import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAddManualTransaction, useBalance, useLedger } from '../api/useAccounts';
import { useLedgerSummary } from '../api/useLedgerSummary';
import { useLedgerExport } from '../api/useLedgerExport';
import { EMPTY_PERIOD, isPeriodActive, type Period } from '../domain/period';
import { ledgerFileName, ledgerToCsv } from '../domain/ledgerCsv';
import { LedgerTable } from './LedgerTable';
import { ManualEntryDialog } from './ManualEntryDialog';
import { PeriodBar } from './PeriodBar';
import { SummaryCards } from './SummaryCards';

interface Props {
  relationshipId: string;
  counterpartyName: string;
  isManufacturer: boolean;
  /** Elle hareket girme yetkisi (kilitli kural 8): perakendeci owner/accountant. */
  canWrite: boolean;
}

/**
 * Cari ekstre paneli — dönem, özet, hareketler, elle giriş ve dışa aktarım.
 *
 * Kendi durumunu taşıyan kapsayıcı: `AccountsPage` 150 satır bütçesindedir
 * (A19) ve bu ekranın beş ayrı durumu var. Katman kuralı korunuyor — doğrudan
 * supabase çağrısı yok, yalnız bu feature'ın api hook'ları.
 */
export function LedgerPanel({ relationshipId, counterpartyName, isManufacturer, canWrite }: Props) {
  const [period, setPeriod] = useState<Period>(EMPTY_PERIOD);
  const [entering, setEntering] = useState(false);

  const ledger = useLedger(relationshipId);
  const summary = useLedgerSummary(relationshipId, period);
  // Elle giriş diyaloğu DÖNEM kapanışını değil gerçek güncel bakiyeyi
  // göstermeli: geçen ayı seçmiş bir kullanıcıya "kayıttan sonra" olarak
  // geçen ayın kapanışını göstermek yanlış bir sayı vaat etmek olurdu.
  const balance = useBalance(relationshipId);
  const addEntry = useAddManualTransaction();
  const exportLedger = useLedgerExport();

  const download = () => {
    exportLedger.mutate(
      { relationshipId, period },
      {
        onSuccess: ({ entries }) => {
          const csv = ledgerToCsv(entries, summary.data ?? null, counterpartyName);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">{counterpartyName}</h3>
        <div className="flex gap-2">
          <Button variant="secondary" loading={exportLedger.isPending} onClick={download}>
            CSV indir
          </Button>
          {canWrite && <Button onClick={() => setEntering(true)}>Hareket ekle</Button>}
        </div>
      </div>

      <PeriodBar period={period} onChange={setPeriod} />

      {summary.data && (
        <SummaryCards
          summary={summary.data}
          periodActive={isPeriodActive(period)}
          isManufacturer={isManufacturer}
        />
      )}

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
        <LedgerTable entries={ledger.data?.pages.flat() ?? []} />
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

      {entering && (
        <ManualEntryDialog
          counterpartyName={counterpartyName}
          currentBalance={balance.data ?? 0}
          pending={addEntry.isPending}
          errorMessage={
            addEntry.isError ? 'Hareket kaydedilemedi. Yetkinizi kontrol edin.' : undefined
          }
          onClose={() => {
            setEntering(false);
            addEntry.reset();
          }}
          onSubmit={(values) =>
            addEntry.mutate({ relationshipId, ...values }, { onSuccess: () => setEntering(false) })
          }
        />
      )}
    </div>
  );
}
