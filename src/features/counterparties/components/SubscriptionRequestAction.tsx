import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRequestSubscription, useSubscriptionStatus } from '../api/useSubscriptionRequest';

interface Props {
  /** Misafir org'un kimliği; abone org'da bu bileşen hiç çizilmez. */
  orgId?: string | undefined;
}

/**
 * Misafir org'un üst çubuktaki "abone ol" eylemi.
 *
 * Üst çubuktan buraya taşındı: veri çeken ve mutasyon yapan bir arayüz
 * `app/layout` altında duramaz (A20). Taşırken üç şey düzeldi — degrade
 * zeminli ve `hover:scale-105` büyüyen düğme standart düğmeye indi, elle
 * yazılmış onay penceresi `ConfirmDialog`'a bağlandı, hata mesajı da
 * pencerenin kendi hata alanına geçti.
 */
export function SubscriptionRequestAction({ orgId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: pending } = useSubscriptionStatus(orgId);
  const request = useRequestSubscription();

  if (pending) {
    return (
      <Badge tone="warning" dot className="hidden sm:inline-flex">
        Üyelik talebiniz inceleniyor
      </Badge>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="hidden sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        Platforma Üye Ol
      </Button>

      {open && (
        <ConfirmDialog
          title="Platform abonesi ol"
          confirmLabel="Talebi gönder"
          pending={request.isPending}
          onCancel={() => setOpen(false)}
          onConfirm={() => request.mutate({}, { onSuccess: () => setOpen(false) })}
          message={
            <div className="space-y-3">
              <p>
                Üyelik talebiniz platform yönetimine iletilecek. Onaylandığında tüm modüllere
                erişiminiz açılır.
              </p>
              {request.isError && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {request.error.message || 'Talep iletilemedi, lütfen tekrar deneyin.'}
                </p>
              )}
            </div>
          }
        />
      )}
    </>
  );
}
