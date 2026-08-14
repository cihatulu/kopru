import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCounterpartyInvites } from '../api/useCounterpartyInvites';
import { CounterpartyInvitations } from './CounterpartyInvitations';
import { InviteCounterpartyModal } from './InviteCounterpartyModal';
import { InviteSentDialog } from './InviteSentDialog';

/**
 * Davet bölümü — düğme, form, gönderim özeti ve liste bir arada.
 *
 * Kendi durumunu TAŞIR. `CustomerManager` 200 satır bütçesine (A19) dayanmış
 * durumda; davet durumunu oraya eklemek bütçeyi patlatırdı. Katman kuralı
 * korunuyor: burada doğrudan supabase çağrısı yok, yalnız feature'ın kendi
 * api hook'u.
 *
 * `noun` yalnız EKRAN METNİDİR. Karşı tarafın tipini sunucu belirler: çağıranın
 * tersi açılır, üretici davet ederse bayi doğar.
 */
export function CounterpartyInvitePanel({ noun }: { noun: string }) {
  const invites = useCounterpartyInvites();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 pt-6 border-t border-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Davetler</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Giriş bilgilerini siz belirleyin; davet {noun.toLocaleLowerCase('tr')}ye WhatsApp ile
            gitsin.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Davet Gönder</Button>
      </div>

      <CounterpartyInvitations
        noun={noun}
        invitations={invites.invitations}
        loading={invites.loading}
        revoking={invites.revoke.isPending}
        deleting={invites.remove.isPending}
        onRevoke={(invitationId) => invites.revoke.mutate(invitationId)}
        onDelete={(invitationId) => invites.remove.mutate(invitationId)}
      />

      {open && (
        <InviteCounterpartyModal
          noun={noun}
          pending={invites.create.isPending}
          errorMessage={
            invites.create.error instanceof Error ? invites.create.error.message : undefined
          }
          onClose={() => setOpen(false)}
          onSubmit={(values) => invites.send(values, () => setOpen(false))}
        />
      )}

      {invites.sent && <InviteSentDialog sent={invites.sent} onClose={invites.clearSent} />}
    </div>
  );
}
