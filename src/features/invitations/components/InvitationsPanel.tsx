import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { OrgKind } from '@/constants';
import { useInvitations } from '../api/useInvitations';
import { useCreateInvitation, useRevokeInvitation } from '../api/useInviteMutations';
import { inviteNoun, inviteUrl, type Invitation } from '../domain/invitation';
import type { CreateInviteForm } from '../domain/inviteSchema';
import { InviteDialog } from './InviteDialog';
import { InviteTable } from './InviteTable';

/**
 * Davet bölümü — kendi durumunu ve sorgularını TAŞIYAN bileşen.
 *
 * Diğer feature bileşenleri saf sunum; bu değil. Sebep: davet bölümü
 * `CounterpartiesPage`'in içinde yaşıyor ve sayfa 150 satır bütçesine (A19)
 * dayanmış durumda. Durumu sayfaya taşımak bütçeyi patlatırdı. Katman kuralı
 * korunuyor — burada doğrudan supabase çağrısı yok, yalnız kendi api hook'ları.
 */
export function InvitationsPanel({ myKind }: { myKind: OrgKind }) {
  const list = useInvitations();
  const create = useCreateInvitation();
  const revoke = useRevokeInvitation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [created, setCreated] = useState<Invitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const invitations = list.data?.pages.flat() ?? [];
  const noun = inviteNoun(myKind);

  const close = () => {
    setDialogOpen(false);
    setCreated(null);
    create.reset();
  };

  const submit = (values: CreateInviteForm) => {
    create.mutate(
      {
        ...(values.companyName ? { companyName: values.companyName } : {}),
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.vknTc ? { vknTc: values.vknTc } : {}),
        discountRate: Number(values.discountRate ?? 0),
        validDays: Number(values.validDays ?? 14),
      },
      { onSuccess: setCreated },
    );
  };

  const copy = (inv: Invitation) => {
    void navigator.clipboard.writeText(inviteUrl(inv.token, window.location.origin)).then(() => {
      setCopiedId(inv.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const cancel = (inv: Invitation) => {
    setBusyId(inv.id);
    revoke.mutate(inv.id, { onSettled: () => setBusyId(undefined) });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Davetler</h3>
          <p className="mt-1 text-sm text-slate-500">
            Link gönderin; {noun} kendi hesabını kendisi açsın. Bilgilerini ve şifresini kendisi
            girer.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Davet oluştur
        </Button>
      </div>

      {revoke.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Davet iptal edilemedi. Kullanılmış bir davet iptal edilemez.
        </p>
      )}

      {list.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <InviteTable
          invitations={invitations}
          copiedId={copiedId}
          busyId={busyId}
          onCopy={copy}
          onRevoke={cancel}
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

      {dialogOpen && (
        <InviteDialog
          myKind={myKind}
          pending={create.isPending}
          created={created}
          errorMessage={
            create.isError ? 'Davet oluşturulamadı. Bilgileri kontrol edin.' : undefined
          }
          onClose={close}
          onSubmit={submit}
        />
      )}
    </section>
  );
}
