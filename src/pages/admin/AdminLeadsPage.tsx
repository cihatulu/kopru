import { Segmented } from '@/components/ui/Segmented';
import { useState } from 'react';
import {
  LEAD_STATUS_META,
  LeadDialog,
  LeadTable,
  nextLeadStatus,
  useAddLead,
  useLeads,
  useSetLeadStatus,
  type LeadStatus,
} from '@/features/leads';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const FILTERS: (LeadStatus | 'all')[] = [
  'all',
  'new',
  'contacted',
  'interested',
  'converted',
  'rejected',
];

/** Aday takibi — YALNIZ KOMPOZİSYON (A20). Yalnız platform admini erişir. */
export default function AdminLeadsPage() {
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useLeads(filter, search);
  const add = useAddLead();
  const setStatus = useSetLeadStatus();

  const change = (id: string, status: LeadStatus) => {
    setBusyId(id);
    setStatus.mutate({ id, status }, { onSettled: () => setBusyId(undefined) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Adaylar</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Henüz platformda olmayan firmalar. VKN girilen bir aday sisteme kaydolduğunda otomatik
            olarak müşteriye dönüşür.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Aday ekle</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Lead durumu"
          options={FILTERS.map((f) => ({
            value: f,
            label: f === 'all' ? 'Tümü' : LEAD_STATUS_META[f].label,
          }))}
          value={filter}
          onChange={setFilter}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Firma adı"
          aria-label="Aday ara"
          className="input w-56"
        />
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LeadTable
          leads={list.data?.pages.flat() ?? []}
          busyId={busyId}
          onAdvance={(l) => {
            const to = nextLeadStatus(l.status);
            if (to) change(l.id, to);
          }}
          onReject={(l) => change(l.id, 'rejected')}
        />
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
        <LeadDialog
          pending={add.isPending}
          errorMessage={add.isError ? 'Eklenemedi. Tekrar deneyin.' : undefined}
          onClose={() => {
            setCreating(false);
            add.reset();
          }}
          onSubmit={(v) => add.mutate(v, { onSuccess: () => setCreating(false) })}
        />
      )}
    </div>
  );
}
