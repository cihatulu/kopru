import { useState } from 'react';
import { LedgerPanel } from '@/features/accounts';
import { PartyPicker, useCounterparties, otherParty, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

/** Cari hesaplar — karşı taraf seç, ekstreyi gör. YALNIZ KOMPOZİSYON (A20). */
export default function AccountsPage() {
  const { data: user } = useAuthSession();
  const [relId, setRelId] = useState<string | null>(null);

  const list = useCounterparties();

  if (!user?.org) return null;
  const orgId = user.org.id;
  const edges: Edge[] = (list.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;
  const selected = edges.find((e) => e.id === relId);

  // KİLİTLİ KURAL 8: cari hareketi perakendeci veya muhasebeci girer;
  // üretici yalnızca izler. Sunucu da aynı kontrolü yapar.
  const canWrite = !isManufacturer && (user.orgRole === 'owner' || user.orgRole === 'accountant');

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
        <LedgerPanel
          relationshipId={selected.id}
          counterpartyName={otherParty(selected, orgId).companyName}
          isManufacturer={isManufacturer}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
