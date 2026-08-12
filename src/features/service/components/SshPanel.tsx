import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useSshRequests, type SshRequest } from '../api/useSshRequests';
import { useAdvanceSsh } from '../api/useServiceMutations';
import { EMPTY_FILTERS, type ServiceFilters } from '../domain/filters';
import { SSH_STATUS_META } from '../domain/labels';
import type { SshStatus } from '../api/shared';
import { ServiceFilterBar } from './ServiceFilterBar';
import { SshDetailDrawer } from './SshDetailDrawer';
import { SshList } from './SshList';
import { SshCreationModal } from './SshCreationModal';
import { SshStatusModal } from './SshStatusModal';

const STATUS_OPTIONS: [string, string][] = (Object.keys(SSH_STATUS_META) as SshStatus[]).map(
  (s) => [s, SSH_STATUS_META[s].label],
);

interface Props {
  myOrgId: string;
  myKind: string;
  /** [orgId, firma adı] — filtre listesi için karşı taraflar. */
  partyOptions: [string, string][];
}

// Icons
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.243a2.25 2.25 0 0 0 1.07 1.916l7.5 4.615a2.25 2.25 0 0 0 2.36 0l7.5-4.615a2.25 2.25 0 0 0 1.07-1.916V12.75" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 4.5h11.25a.75.75 0 0 1 .75.75v9.75h-12V5.25a.75.75 0 0 1 .75-.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75h4.81a1.5 1.5 0 0 1 1.258.683l1.8 2.7a1.5 1.5 0 0 1 .182.717v2.4a.75.75 0 0 1-.75.75h-1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export function SshPanel({ myOrgId, myKind, partyOptions }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<SshRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const list = useSshRequests(myOrgId, myKind, filters);
  const advance = useAdvanceSsh();

  const isRetailer = myKind === 'retailer';
  const requests = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);

  // Stat calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const inspecting = requests.filter((r) => r.status === 'bekliyor' || r.status === 'inceleniyor').length;
    const shipped = requests.filter((r) => r.status === 'parca_gonderildi').length;
    const completed = requests.filter((r) => r.status === 'tamamlandi').length;
    return { total, inspecting, shipped, completed };
  }, [requests]);

  const handleUpdateStatus = (status: SshStatus, note?: string) => {
    if (!statusTarget) return;
    advance.mutate(
      { id: statusTarget.id, status, note },
      {
        onSuccess: () => {
          setStatusTarget(null);
          void list.refetch();
        },
      },
    );
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isRetailer ? 'SSH (Satış Sonrası Hizmet) Taleplerim' : 'Satış Sonrası Hizmet (SSH) Talepleri'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Satış sonrası hizmet (SSH) taleplerini takip edin ve durumlarını güncelleyin.
          </p>
        </div>
        {isRetailer && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            SSH Talebi Başlat
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-slate-100/70 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">TOPLAM TALEP</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
            <FolderIcon />
          </div>
        </div>

        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 to-amber-100/60 border border-amber-200/80 shadow-[0_4px_12px_rgba(245,158,11,0.06)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-widest">İNCELENİYOR</p>
            <p className="text-2xl font-black text-amber-800 mt-1.5">{stats.inspecting}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100/80 shadow-sm border border-amber-200/80 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
            <ClockIcon />
          </div>
        </div>

        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 to-purple-100/60 border border-purple-200/80 shadow-[0_4px_12px_rgba(168,85,247,0.06)] hover:shadow-[0_8px_20px_rgba(168,85,247,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-purple-700 uppercase tracking-widest">PARÇA GÖNDERİLDİ</p>
            <p className="text-2xl font-black text-purple-800 mt-1.5">{stats.shipped}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-100/80 shadow-sm border border-purple-200/80 flex items-center justify-center text-purple-700 group-hover:scale-110 transition-transform">
            <TruckIcon />
          </div>
        </div>

        <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-emerald-100/60 border border-emerald-200/80 shadow-[0_4px_12px_rgba(16,185,129,0.06)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">TAMAMLANAN</p>
            <p className="text-2xl font-black text-emerald-800 mt-1.5">{stats.completed}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 shadow-sm border border-emerald-200/80 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
            <CheckIcon />
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

      {list.isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
          ⚠️ Talepler yüklenirken bir hata oluştu: {String((list.error as any)?.message || list.error)}
        </div>
      )}

      {/* List Table */}
      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <SshList
          requests={requests}
          myOrgId={myOrgId}
          isManufacturer={!isRetailer}
          onOpen={(r) => setOpenId(r.id)}
          onOpenStatusModal={(r) => setStatusTarget(r)}
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

      {openId && (
        <SshDetailDrawer sshId={openId} myOrgId={myOrgId} onClose={() => setOpenId(null)} />
      )}

      {statusTarget && (
        <SshStatusModal
          request={statusTarget}
          isPending={advance.isPending}
          onClose={() => setStatusTarget(null)}
          onSubmit={handleUpdateStatus}
        />
      )}

      {/* Modal */}
      {showCreateModal && (
        <SshCreationModal
          myOrgId={myOrgId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => void list.refetch()}
        />
      )}
    </div>
  );
}
