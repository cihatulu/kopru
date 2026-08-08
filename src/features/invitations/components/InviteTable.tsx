import { Button } from '@/components/ui/Button';
import {
  INVITE_STATE_LABEL,
  daysLeft,
  inviteState,
  isActionable,
  type Invitation,
  type InviteState,
} from '../domain/invitation';

const STATE_CLASS: Record<InviteState, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  used: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  revoked: 'bg-slate-100 text-slate-600 ring-slate-200',
  expired: 'bg-red-50 text-red-700 ring-red-200',
};

interface Props {
  invitations: Invitation[];
  copiedId: string | null;
  busyId: string | undefined;
  onCopy: (invitation: Invitation) => void;
  onRevoke: (invitation: Invitation) => void;
}

export function InviteTable({ invitations, copiedId, busyId, onCopy, onRevoke }: Props) {
  if (invitations.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Henüz davet göndermediniz.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Firma</th>
            <th className="px-4 py-3">VKN</th>
            <th className="px-4 py-3">İskonto</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invitations.map((inv) => (
            <Row
              key={inv.id}
              invitation={inv}
              copied={copiedId === inv.id}
              busy={busyId === inv.id}
              onCopy={onCopy}
              onRevoke={onRevoke}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  invitation,
  copied,
  busy,
  onCopy,
  onRevoke,
}: {
  invitation: Invitation;
  copied: boolean;
  busy: boolean;
  onCopy: (i: Invitation) => void;
  onRevoke: (i: Invitation) => void;
}) {
  const state = inviteState(invitation);
  const actionable = isActionable(state);

  return (
    <tr className="text-slate-700">
      <td className="px-4 py-3 font-medium text-slate-900">
        {invitation.companyName ?? <span className="text-slate-400">Belirtilmedi</span>}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {invitation.vknTc ?? <span className="font-sans text-slate-400">Serbest</span>}
      </td>
      <td className="px-4 py-3">%{invitation.discountRate}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATE_CLASS[state]}`}
        >
          {INVITE_STATE_LABEL[state]}
        </span>
        {state === 'pending' && (
          <span className="ml-2 text-xs text-slate-400">{daysLeft(invitation)} gün</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {actionable && (
            <>
              <Button variant="secondary" onClick={() => onCopy(invitation)}>
                {copied ? 'Kopyalandı' : 'Linki kopyala'}
              </Button>
              <Button variant="ghost" loading={busy} onClick={() => onRevoke(invitation)}>
                İptal
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
