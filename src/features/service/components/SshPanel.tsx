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
import { SshStatCards } from './SshStatCards';
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

export function SshPanel({ myOrgId, myKind, partyOptions }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<SshRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const list = useSshRequests(myOrgId, myKind, filters);
  const advance = useAdvanceSsh();

  const isRetailer = myKind === 'retailer';
  const requests = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isRetailer
              ? 'SSH (Satış Sonrası Hizmet) Taleplerim'
              : 'Satış Sonrası Hizmet (SSH) Talepleri'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Satış sonrası hizmet (SSH) taleplerini takip edin ve durumlarını güncelleyin.
          </p>
        </div>

        {isRetailer && (
          <Button onClick={() => setShowCreateModal(true)}>SSH Talebi Başlat</Button>
        )}
      </div>

      <SshStatCards requests={requests} />

      <ServiceFilterBar
        filters={filters}
        statusOptions={STATUS_OPTIONS}
        partyOptions={partyOptions}
        onChange={setFilters}
      />

      {list.isError && (
        <p role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold">
          ⚠️ Talepler yüklenirken bir hata oluştu:{' '}
          {list.error instanceof Error ? list.error.message : String(list.error)}
        </p>
      )}

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
