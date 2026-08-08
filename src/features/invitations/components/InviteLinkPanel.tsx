import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { inviteUrl, type Invitation } from '../domain/invitation';

/**
 * Davet üretildikten sonra gösterilen link.
 *
 * Geçici şifreden farklı olarak bu değer BİR DAHA GÖSTERİLEBİLİR — token
 * listede duruyor. Yine de kullanıcı buradan kopyalayabilsin diye gösteriyoruz;
 * diyaloğu kapatıp listede aramak fazladan adım olurdu.
 */
export function InviteLinkPanel({
  invitation,
  noun,
  onClose,
}: {
  invitation: Invitation;
  noun: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(invitation.token, window.location.origin);

  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">Davet hazır</h2>
      <p className="mt-1 text-sm text-slate-500">
        Linki {noun}nize iletin. Açtığında kendi bilgilerini girip şifresini belirleyecek.
      </p>

      <div className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <p className="break-all font-mono text-xs text-slate-700">{url}</p>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {invitation.vknTc
          ? `Bu davet ${invitation.vknTc} numarasına kilitli — başkası kullanamaz.`
          : 'Bu davet herhangi bir vergi numarasıyla kullanılabilir. Yalnız hedef firmaya iletin.'}
      </p>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? 'Kopyalandı' : 'Linki kopyala'}
        </Button>
        <Button onClick={onClose}>Kapat</Button>
      </div>
    </>
  );
}
