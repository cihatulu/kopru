import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import type { OrgKind } from '@/constants';

const SUPPORT_WHATSAPP_PHONE = '905015630369';

interface Props {
  kind: OrgKind;
  onClose: () => void;
}

export function LeadApplicationModal({ kind, onClose }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [vknTc, setVknTc] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  const isManufacturer = kind === 'manufacturer';
  const roleTitle = isManufacturer ? 'Üye Üretici' : 'Üye Perakendeci';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Lütfen firma adınızı giriniz.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Lütfen geçerli bir telefon numarası giriniz (örn: 05xx...).');
      return;
    }

    setPending(true);

    const fullLocation = [city.trim(), district.trim()].filter(Boolean).join(' / ');

    try {
      // 1. Veritabanına kaydetmeyi dene (arka planda)
      const { error: rpcError } = await (supabase.rpc as any)('submit_lead_application', {
        p_company_name: companyName.trim(),
        p_vkn_tc: vknTc.trim() || null,
        p_kind: kind,
        p_city: fullLocation || null,
        p_phone: phone.trim(),
        p_email: email.trim() || null,
      });

      if (rpcError) {
        console.warn('Lead application RPC notice:', rpcError);
      }
    } catch (rpcErr) {
      console.warn('Lead application notice:', rpcErr);
    }

    try {
      // 2. WhatsApp mesajı hazırla
      const msgLines = [
        `Merhaba, KÖPRÜ B2B platformuna ${roleTitle} olarak katılmak istiyoruz.`,
        '',
        '📋 *Başvuru Bilgilerimiz:*',
        `• *Başvuru Türü:* ${roleTitle}`,
        `• *Firma Adı:* ${companyName.trim()}`,
        vknTc.trim() ? `• *VKN / TCKN:* ${vknTc.trim()}` : null,
        fullLocation ? `• *İl / İlçe:* ${fullLocation}` : null,
        `• *Telefon:* ${phone.trim()}`,
        email.trim() ? `• *E-posta:* ${email.trim()}` : null,
      ].filter((line): line is string => line !== null);

      const message = msgLines.join('\n');

      const link = buildWhatsAppLink({
        phone: SUPPORT_WHATSAPP_PHONE,
        message,
      });

      setWhatsappLink(link);
      setSuccess(true);

      // WhatsApp'ı yeni pencerede aç
      if (typeof window !== 'undefined') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.warn('Submission fallback:', err);
      // WhatsApp linkini yine de oluştur ve aç
      const link = buildWhatsAppLink({
        phone: SUPPORT_WHATSAPP_PHONE,
        message: `Merhaba, KÖPRÜ B2B platformuna ${roleTitle} olarak başvurmak istiyorum. Firma: ${companyName.trim()}, Tel: ${phone.trim()}`,
      });
      setWhatsappLink(link);
      setSuccess(true);
      if (typeof window !== 'undefined') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      label={`${roleTitle} Başvurusu`}
      panelClassName="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      {success ? (
        <div className="space-y-5 text-center py-3">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✅
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Başvurunuz Başarıyla Alındı!
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Bilgileriniz yetkili ekibimize iletilmiştir. WhatsApp üzerinden de doğrudan görüşme başlatabilirsiniz.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800 space-y-1 text-left">
            <div className="font-bold">Firma: {companyName}</div>
            <div>Başvuru: {roleTitle}</div>
            <div>Telefon: {phone}</div>
            {email.trim() && <div>E-posta: {email.trim()}</div>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
            >
              <span>💬 WhatsApp ile Mesaj Gönder</span>
            </a>
            <Button variant="secondary" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isManufacturer ? '🏭' : '🏬'}</span>
              <h2 className="text-xl font-black text-slate-900">
                {roleTitle} Başvuru Formu
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              KÖPRÜ platformuna katılmak için lütfen bilgilerinizi doldurunuz.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Firma Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input w-full text-sm"
                placeholder="Örn: Sena Mobilya San. Tic. Ltd."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Firma VKN / TCKN <span className="text-slate-400 font-normal normal-case">(İsteğe Bağlı)</span>
              </label>
              <input
                type="text"
                maxLength={11}
                className="input w-full font-mono text-sm"
                placeholder="10 veya 11 haneli vergi no"
                value={vknTc}
                onChange={(e) => setVknTc(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  İl
                </label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  placeholder="Örn: Bursa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  İlçe
                </label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  placeholder="Örn: İnegöl"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                className="input w-full font-mono text-sm"
                placeholder="05xx xxx xx xx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                E-Posta <span className="text-slate-400 font-normal normal-case">(İsteğe Bağlı)</span>
              </label>
              <input
                type="email"
                className="input w-full text-sm"
                placeholder="info@firmaniz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              İptal
            </Button>
            <Button
              type="submit"
              loading={pending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              💬 WhatsApp ile Başvuruyu İlet
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
