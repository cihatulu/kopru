import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { useReturnRequests } from '../api/useReturnRequests';
import { useDecideReturn } from '../api/useServiceMutations';
import { EMPTY_FILTERS, type ServiceFilters } from '../domain/filters';
import { RETURN_STATUS_META } from '../domain/labels';
import type { ReturnStatus } from '../api/shared';
import { ReturnList } from './ReturnList';
import { ServiceFilterBar } from './ServiceFilterBar';
import { ReturnCreationModal } from './ReturnCreationModal';

const STATUS_OPTIONS: [string, string][] = (Object.keys(RETURN_STATUS_META) as ReturnStatus[]).map(
  (s) => [s, RETURN_STATUS_META[s].label],
);

interface Props {
  myOrgId: string;
  myKind: string;
  partyOptions: [string, string][];
}

export function ReturnPanel({ myOrgId, myKind, partyOptions }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const list = useReturnRequests(myOrgId, myKind, filters);
  const decide = useDecideReturn();

  const isRetailer = myKind === 'retailer';
  const requests = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);

  // Stat calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  return (
    <div className="space-y-6 font-sans text-slate-800 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">İade Talepleri</h1>
          <p className="text-slate-500 text-xs mt-1">İade süreçlerinizi buradan yönetin ve takip edin.</p>
        </div>
        {isRetailer && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Yeni İade Talebi
          </button>
        )}
      </div>

      {/* Unified Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="TOPLAM TALEP"
          value={stats.total}
          iconClass="bg-slate-100 text-slate-500"
          valueClass="text-slate-900"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
        />
        <StatCard
          label="BEKLEYEN"
          value={stats.pending}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="ONAYLANAN"
          value={stats.approved}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="REDDEDİLEN"
          value={stats.rejected}
          iconClass="bg-red-50 text-red-600"
          valueClass="text-red-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M10 14l4-4m0 4l-4-4m11 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
      </div>

      {/* Filter Bar */}
      <ServiceFilterBar
        filters={filters}
        statusOptions={STATUS_OPTIONS}
        partyOptions={partyOptions}
        onChange={setFilters}
      />

      {/* List */}
      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ReturnList
          requests={requests}
          myOrgId={myOrgId}
          isManufacturer={!isRetailer}
          busyId={busyId}
          onDecide={(r, approve) => {
            setBusyId(r.id);
            decide.mutate({ id: r.id, approve }, { onSettled: () => setBusyId(undefined) });
          }}
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

      {/* Modal */}
      {showCreateModal && (
        <ReturnCreationModal
          myOrgId={myOrgId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => void list.refetch()}
        />
      )}
    </div>
  );
}
