import { Segmented } from '@/components/ui/Segmented';
import { TH, THEAD } from '@/components/ui/Table';
import { useState } from 'react';
import { RelationshipBadge, useRelationshipList, useSetRelationshipStatus } from '@/features/admin';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { RELATIONSHIP_STATUS, type RelationshipStatus } from '@/constants';

type Filter = RelationshipStatus | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: RELATIONSHIP_STATUS.pending, label: 'Onay bekleyen' },
  { id: RELATIONSHIP_STATUS.active, label: 'Aktif' },
  { id: RELATIONSHIP_STATUS.passive, label: 'Pasif' },
];

const TD = 'px-4 py-3 align-middle';

/** İlişki grafiği — köprünün eşleşme tablosunun yerini alan tek kaynak. */
export default function AdminRelationshipsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const list = useRelationshipList(filter);
  const setStatus = useSetRelationshipStatus();

  const rows = list.data?.pages.flat() ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">İlişkiler</h2>
        <p className="mt-1 text-sm text-slate-500">
          Üretici ↔ perakendeci ticari bağları. Sipariş, cari ve iade kayıtları bu kenarlara asılır.
        </p>
      </div>

      <Segmented
        label="İlişki durumu"
        options={FILTERS.map((f) => ({ value: f.id, label: f.label }))}
        value={filter}
        onChange={setFilter}
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          Kayıt bulunamadı.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Üretici</th>
                <th className={TH}>Perakendeci</th>
                <th className={TH}>Durum</th>
                <th className={TH}>İskonto</th>
                <th className={`${TH} text-right`}>İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((rel) => (
                <tr key={rel.id} className="hover:bg-slate-50/60">
                  <td className={TD}>
                    <span className="block font-medium text-slate-900">
                      {rel.manufacturer.companyName}
                    </span>
                    <span className="block font-mono text-xs text-slate-500">
                      {rel.manufacturer.vknTc}
                      {!rel.manufacturer.isSubscriber && ' · misafir'}
                    </span>
                  </td>
                  <td className={TD}>
                    <span className="block font-medium text-slate-900">
                      {rel.retailer.companyName}
                    </span>
                    <span className="block font-mono text-xs text-slate-500">
                      {rel.retailer.vknTc}
                      {!rel.retailer.isSubscriber && ' · misafir'}
                    </span>
                  </td>
                  <td className={TD}>
                    <RelationshipBadge status={rel.status} />
                  </td>
                  <td className={`${TD} text-slate-600`}>%{rel.discountRate}</td>
                  <td className={`${TD} text-right`}>
                    <Button
                      variant={rel.status === 'active' ? 'ghost' : 'primary'}
                      onClick={() =>
                        setStatus.mutate({
                          id: rel.id,
                          status: rel.status === 'active' ? 'passive' : 'active',
                        })
                      }
                    >
                      {rel.status === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
