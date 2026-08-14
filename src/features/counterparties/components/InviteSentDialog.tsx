import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { InviteSent } from '../api/useCounterpartyInvites';

interface Props {
  sent: InviteSent;
  onClose: () => void;
}

/**
 * Davet oluşturuldu — WhatsApp'a gönderim adımı.
 *
 * Mesaj kendiliğinden GİTMEZ: WhatsApp Business API yok, bu yüzden `wa.me`
 * bağlantısıyla WhatsApp açılır ve mesaj hazır gelir; göndermeye kullanıcı
 * basar. Numara okunamazsa düğme pasif olur — boş bir sohbet açmak, mesaj
 * gitmiş sanılmasına yol açardı.
 */
export function InviteSentDialog({ sent, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(sent.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal label="Davet oluşturuldu" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Davet hazır</h2>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{sent.companyName}</span> için hesap
            oluşturuldu. Giriş bilgileri WhatsApp mesajında yer alıyor.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">Kullanıcı kodu</span>
            <span className="font-mono font-bold text-slate-900">{sent.userCode}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Şifre yalnız mesajda iletilir; sistemde okunabilir biçimde saklanmaz. Unutulursa
            listeden <span className="font-semibold">Şifre Sıfırla</span> ile yenisi verilir.
          </p>
        </div>

        {!sent.whatsappUrl && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
            Telefon numarası WhatsApp için okunamadı. Bağlantıyı kopyalayıp elle
            gönderebilirsiniz.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={copy}>
            {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
          {sent.whatsappUrl && (
            <a
              href={sent.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              WhatsApp ile Gönder
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
