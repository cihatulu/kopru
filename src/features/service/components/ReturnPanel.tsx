import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
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
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Yeni İade Talebi
          </button>
        )}
      </div>

      {/* 3D-Style Elevated Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOPLAM TALEP */}
        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-slate-100/70 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">TOPLAM TALEP</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform font-bold text-sm">
            📋
          </div>
        </div>

        {/* Card 2: BEKLEYEN */}
        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 to-amber-100/60 border border-amber-200/80 shadow-[0_4px_12px_rgba(245,158,11,0.06)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-widest">BEKLEYEN</p>
            <p className="text-2xl font-black text-amber-800 mt-1.5">{stats.pending}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100/80 shadow-sm border border-amber-200/80 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform font-bold text-sm">
            ⏳
          </div>
        </div>

        {/* Card 3: ONAYLANAN */}
        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-emerald-100/60 border border-emerald-200/80 shadow-[0_4px_12px_rgba(16,185,129,0.06)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">ONAYLANAN</p>
            <p className="text-2xl font-black text-emerald-800 mt-1.5">{stats.approved}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 shadow-sm border border-emerald-200/80 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform font-bold text-sm">
            ✅
          </div>
        </div>

        {/* Card 4: REDDEDİLEN */}
        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-rose-50/90 to-rose-100/60 border border-rose-200/80 shadow-[0_4px_12px_rgba(244,63,94,0.06)] hover:shadow-[0_8px_20px_rgba(244,63,94,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-rose-700 uppercase tracking-widest">REDDEDİLEN</p>
            <p className="text-2xl font-black text-rose-800 mt-1.5">{stats.rejected}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100/80 shadow-sm border border-rose-200/80 flex items-center justify-center text-rose-700 group-hover:scale-110 transition-transform font-bold text-sm">
            ❌
          </div>
        </div>
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
