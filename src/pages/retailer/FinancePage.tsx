import { useState } from 'react';
import {
  FinanceDialog,
  FinanceTable,
  financeTotals,
  useAddFinanceEntry,
  useFinanceEntries,
} from '@/features/finance';
import { StatCard } from '@/features/reports';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/format';

/** Perakendecinin gelir/gider defteri — YALNIZ KOMPOZİSYON (A20). */
export default function FinancePage() {
  const { data: user } = useAuthSession();
  const [creating, setCreating] = useState(false);

  const list = useFinanceEntries();
  const add = useAddFinanceEntry();

  if (!user?.org) return null;
  const entries = list.data?.pages.flat() ?? [];
  const totals = financeTotals(entries);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Finans</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            İşletmenizin gelir ve giderleri. Bu defter tedarikçi cari hesabınızdan ayrıdır — biri
            borç ilişkisi, diğeri nakit akışınız.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Kayıt ekle</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gelir" value={formatMoney(totals.income)} tone="positive" />
        <StatCard label="Gider" value={formatMoney(totals.expense)} />
        <StatCard
          label="Net"
          value={formatMoney(totals.net)}
          tone={totals.net >= 0 ? 'positive' : 'default'}
          hint="Yüklenen kayıtlar üzerinden"
        />
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <FinanceTable entries={entries} />
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}

      {creating && (
        <FinanceDialog
          pending={add.isPending}
          errorMessage={add.isError ? 'Kaydedilemedi. Tekrar deneyin.' : undefined}
          onClose={() => {
            setCreating(false);
            add.reset();
          }}
          onSubmit={(v) =>
            add.mutate(
              { retailerOrgId: user.org.id, ...v },
              { onSuccess: () => setCreating(false) },
            )
          }
        />
      )}
    </div>
  );
}
