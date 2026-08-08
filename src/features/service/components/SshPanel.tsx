import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useSshRequests } from '../api/useSshRequests';
import { useAdvanceSsh } from '../api/useServiceMutations';
import { EMPTY_FILTERS, type ServiceFilters } from '../domain/filters';
import { SSH_STATUS_META, nextSshStatus } from '../domain/labels';
import type { SshStatus } from '../api/shared';
import { ServiceFilterBar } from './ServiceFilterBar';
import { SshDetailDrawer } from './SshDetailDrawer';
import { SshList } from './SshList';

const STATUS_OPTIONS: [string, string][] = (
  Object.keys(SSH_STATUS_META) as SshStatus[]
).map((s) => [s, SSH_STATUS_META[s].label]);

interface Props {
  myOrgId: string;
  myKind: string;
  /** [orgId, firma adı] — filtre listesi için karşı taraflar. */
  partyOptions: [string, string][];
}

/** SSH sekmesi: filtre + liste + detay. Kendi durumunu taşır (A19 bütçesi). */
export function SshPanel({ myOrgId, myKind, partyOptions }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useSshRequests(myOrgId, myKind, filters);
  const advance = useAdvanceSsh();

  const move = (id: string, status: SshStatus) => {
    setBusyId(id);
    advance.mutate({ id, status }, { onSettled: () => setBusyId(undefined) });
  };

  return (
    <div className="space-y-4">
      <ServiceFilterBar
        filters={filters}
        statusOptions={STATUS_OPTIONS}
        partyOptions={partyOptions}
        onChange={setFilters}
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <SshList
          requests={list.data?.pages.flat() ?? []}
          myOrgId={myOrgId}
          busyId={busyId}
          onOpen={(r) => setOpenId(r.id)}
          onAdvance={(r) => {
            const to = nextSshStatus(r.status);
            if (to) move(r.id, to);
          }}
          onCancel={(r) => move(r.id, 'iptal')}
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
    </div>
  );
}
