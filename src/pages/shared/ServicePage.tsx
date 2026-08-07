import { useState } from 'react';
import {
  ReturnList,
  SshDialog,
  SshList,
  nextSshStatus,
  useAdvanceSsh,
  useCreateSsh,
  useDecideReturn,
  useReturnRequests,
  useSshRequests,
} from '@/features/service';
import { PartyPicker, useCounterparties, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** SSH ve iade — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function ServicePage() {
  const { data: user } = useAuthSession();
  const [tab, setTab] = useState<'ssh' | 'returns'>('ssh');
  const [creating, setCreating] = useState(false);
  const [relId, setRelId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const orgId = user?.org?.id ?? '';
  const ssh = useSshRequests(orgId);
  const returns = useReturnRequests(orgId);
  const edges: Edge[] = (useCounterparties().data?.pages.flat() ?? []).filter(
    (e) => e.status === 'active',
  );

  const createSsh = useCreateSsh();
  const advanceSsh = useAdvanceSsh();
  const decideReturn = useDecideReturn();

  if (!user?.org) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Servis ve İade</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Satış sonrası servis talepleri ve iade süreçleri. Onaylanan iade, cari hesaba
            dengeleyici bir alacak olarak işlenir; mevcut borç kaydı değişmez.
          </p>
        </div>
        {tab === 'ssh' && <Button onClick={() => setCreating(true)}>Servis talebi aç</Button>}
      </div>

      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        {(['ssh', 'returns'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t === 'ssh' ? 'Servis' : 'İadeler'}
          </button>
        ))}
      </div>

      {tab === 'ssh' ? (
        ssh.isPending ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <SshList
            requests={ssh.data?.pages.flat() ?? []}
            myOrgId={orgId}
            busyId={busyId}
            onAdvance={(r) => {
              const to = nextSshStatus(r.status);
              if (!to) return;
              setBusyId(r.id);
              advanceSsh.mutate(
                { id: r.id, status: to },
                { onSettled: () => setBusyId(undefined) },
              );
            }}
            onCancel={(r) => {
              setBusyId(r.id);
              advanceSsh.mutate(
                { id: r.id, status: 'iptal' },
                { onSettled: () => setBusyId(undefined) },
              );
            }}
          />
        )
      ) : returns.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ReturnList
          requests={returns.data?.pages.flat() ?? []}
          myOrgId={orgId}
          busyId={busyId}
          onDecide={(r, approve) => {
            setBusyId(r.id);
            decideReturn.mutate(
              { id: r.id, approve },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
        />
      )}

      {creating && (
        <>
          <PartyPicker
            edges={edges}
            myOrgId={orgId}
            selectedId={relId}
            emptyText="Aktif ilişkiniz yok."
            onSelect={(e) => setRelId(e.id)}
          />
          <SshDialog
            pending={createSsh.isPending}
            errorMessage={
              createSsh.isError
                ? 'Açılamadı. İlişki seçili mi ve servis modülü açık mı kontrol edin.'
                : undefined
            }
            onClose={() => {
              setCreating(false);
              createSsh.reset();
            }}
            onSubmit={(v) => {
              const target = relId ?? edges[0]?.id;
              if (!target) return;
              createSsh.mutate(
                { relationshipId: target, ...v },
                { onSuccess: () => setCreating(false) },
              );
            }}
          />
        </>
      )}
    </div>
  );
}
