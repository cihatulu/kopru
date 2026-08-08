import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useReturnRequests } from '../api/useReturnRequests';
import { useDecideReturn } from '../api/useServiceMutations';
import { EMPTY_FILTERS, type ServiceFilters } from '../domain/filters';
import { RETURN_STATUS_META } from '../domain/labels';
import type { ReturnStatus } from '../api/shared';
import { ReturnList } from './ReturnList';
import { ServiceFilterBar } from './ServiceFilterBar';

const STATUS_OPTIONS: [string, string][] = (
  Object.keys(RETURN_STATUS_META) as ReturnStatus[]
).map((s) => [s, RETURN_STATUS_META[s].label]);

interface Props {
  myOrgId: string;
  myKind: string;
  partyOptions: [string, string][];
}

/** İade sekmesi: filtre + liste + karar. Kendi durumunu taşır (A19 bütçesi). */
export function ReturnPanel({ myOrgId, myKind, partyOptions }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useReturnRequests(myOrgId, myKind, filters);
  const decide = useDecideReturn();

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
        <ReturnList
          requests={list.data?.pages.flat() ?? []}
          myOrgId={myOrgId}
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
    </div>
  );
}
