import { useState } from 'react';
import { ReturnPanel, SshDialog, SshPanel, useCreateSsh } from '@/features/service';
import { PartyPicker, otherParty, useCounterparties, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';

/** SSH ve iade — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function ServicePage() {
  const { data: user } = useAuthSession();
  const [tab, setTab] = useState<'ssh' | 'returns'>('ssh');
  const [creating, setCreating] = useState(false);
  const [relId, setRelId] = useState<string | null>(null);

  const orgId = user?.org?.id ?? '';
  const edges: Edge[] = (useCounterparties().data?.pages.flat() ?? []).filter(
    (e) => e.status === 'active' && (e.manufacturerOrgId === orgId || e.retailer.id === orgId),
  );
  const createSsh = useCreateSsh();

  if (!user?.org) return null;
  const myKind = user.org.kind;

  // Filtre listesi karşı taraflardan kurulur; aynı firma iki kez görünmesin.
  const partyOptions: [string, string][] = [
    ...new Map(
      edges.map((e) => {
        const p = otherParty(e, orgId);
        return [p.id, p.companyName] as [string, string];
      }),
    ),
  ];

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
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t === 'ssh' ? 'Servis' : 'İadeler'}
          </button>
        ))}
      </div>

      {tab === 'ssh' ? (
        <SshPanel myOrgId={orgId} myKind={myKind} partyOptions={partyOptions} />
      ) : (
        <ReturnPanel myOrgId={orgId} myKind={myKind} partyOptions={partyOptions} />
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
