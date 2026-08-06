import { useState } from 'react';
import { LedgerTable, useBalance, useLedger } from '@/features/accounts';
import { PartyPicker, useCounterparties, otherParty, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/format';
import { ORG_KIND } from '@/constants';

/** Cari hesaplar — karşı taraf seç, ekstreyi gör. YALNIZ KOMPOZİSYON (A20). */
export default function AccountsPage() {
  const { data: user } = useAuthSession();
  const [relId, setRelId] = useState<string | null>(null);

  const list = useCounterparties();
  const ledger = useLedger(relId);
  const balance = useBalance(relId);

  if (!user?.org) return null;
  const orgId = user.org.id;
  const edges: Edge[] = (list.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;
  const selected = edges.find((e) => e.id === relId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Cari Hesaplar</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Tutarlar üreticinin satış fiyatı üzerinden işler.{' '}
          {isManufacturer
            ? 'Bu ekran salt okunurdur; hareket girişini perakendeci yapar.'
            : 'Sipariş verdiğinizde borç, ödeme kaydettiğinizde alacak oluşur.'}
        </p>
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <PartyPicker
          edges={edges}
          myOrgId={orgId}
          selectedId={relId}
          emptyText="Aktif ticari ilişkiniz yok."
          onSelect={(e) => setRelId(e.id)}
        />
      )}

      {selected && (
        <>
          <div className="rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200">
            <p className="text-xs font-semibold text-slate-500">
              {otherParty(selected, orgId).companyName} — güncel bakiye
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {balance.isPending ? '…' : formatMoney(balance.data ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isManufacturer ? 'Pozitif = müşteriniz borçlu' : 'Pozitif = borçlusunuz'}
            </p>
          </div>

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
        </>
      )}
    </div>
  );
}
