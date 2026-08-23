import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ORG_KIND, PASSWORD_MIN_LENGTH, PASSWORD_REGEX, type OrgKind } from '@/constants';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import type { OrgParty } from '../domain/counterparty';

function generateRandomPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let password = '';
  password += letters[Math.floor(Math.random() * letters.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  const allChars = letters + digits;
  for (let i = 2; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

interface Props {
  party: OrgParty;
  myVknTc: string;
  myKind?: OrgKind;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void> | void;
}

export function GuestCredentialsModal({
  party,
  myVknTc,
  myKind,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState(() => generateRandomPassword());
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isRetailer = myKind === ORG_KIND.retailer;
  const sponsorLabel = isRetailer ? 'Sizi Ekleyen Perakendecinin VKN\'si:' : 'Sizi Ekleyen Üreticinin VKN\'si:';
  const sponsorShort = isRetailer ? 'Perakendeci VKN:' : 'Üretici VKN:';
  const targetNoun = isRetailer ? 'üreticinin' : 'perakendecinin';
  const targetNounCap = isRetailer ? 'Üretici' : 'Perakendeci';
  const loginPath = isRetailer ? '/m' : '/r';

  const strong = password.length >= PASSWORD_MIN_LENGTH && PASSWORD_REGEX.test(password);

  const handleSave = async () => {
    if (!strong) return;
    try {
      await onSubmit(password);
      setSavedPassword(password);
    } catch {
      // Hata üst bileşenden errorMessage olarak akar
    }
  };

  const handleRegenerate = () => {
    setPassword(generateRandomPassword());
  };

  const shareText = `Merhaba ${party.companyName},\n\nKÖPRÜ B2B platformuna giriş bilgileriniz:\n• ${sponsorShort} ${myVknTc}\n• Kullanıcı Kodu / VKN: ${party.vknTc}\n• Şifre: ${savedPassword ?? password}\n\nGiriş adresi: ${typeof window !== 'undefined' ? window.location.origin : ''}${loginPath}\n\nBu bilgilerle giriş yaptığınızda hesabınız ve bağlantımız otomatik olarak aktifleşecektir.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Panoya kopyalama başarısız olursa
    }
  };

  const whatsappUrl = buildWhatsAppLink({
    phone: party.phone ?? undefined,
    message: shareText,
  });

  return (
    <Modal
      label="Misafir Giriş Bilgileri"
      panelClassName="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            {party.companyName}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Misafir {targetNoun} giriş bilgilerini ve şifresini buradan yönetebilirsiniz.
          </p>
        </div>

        {savedPassword ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-3">
                <span>✅</span>
                <span>Giriş Şifresi Başarıyla Güncellendi</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-emerald-200/60">
                  <span className="text-slate-500">{sponsorLabel}</span>
                  <span className="font-mono font-bold text-slate-800 select-all bg-white px-2 py-0.5 rounded border border-slate-200">
                    {myVknTc}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-emerald-200/60">
                  <span className="text-slate-500">Vergi No / Kullanıcı Kodu:</span>
                  <span className="font-mono font-bold text-slate-800 select-all bg-white px-2 py-0.5 rounded border border-slate-200">
                    {party.vknTc}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Giriş Şifresi:</span>
                  <span className="font-mono font-bold text-emerald-700 select-all bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {savedPassword}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 leading-relaxed font-medium">
              ℹ️ Misafir {targetNoun} bu bilgilerle sisteme ilk kez giriş yaptığında, bağlantı isteği otomatik olarak onaylanacaktır.
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? '✓ Kopyalandı' : '📋 Bilgileri Kopyala'}
                </Button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <span>💬 WhatsApp ile Gönder</span>
                </a>
              </div>
              <Button size="sm" onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Yeni Giriş Şifresi Belirleyin
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input w-full font-mono text-sm font-bold tracking-wider"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={handleRegenerate}
                    title="Yeni Rastgele Şifre Üret"
                  >
                    🎲 Yenile
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  En az {PASSWORD_MIN_LENGTH} karakter, en az bir harf ve bir rakam içermelidir.
                </p>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">{sponsorShort}</span>
                  <span className="font-mono font-semibold">{myVknTc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kullanıcı Kodu (VKN):</span>
                  <span className="font-mono font-semibold">{party.vknTc}</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {errorMessage}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={onClose} disabled={pending}>
                İptal
              </Button>
              <Button loading={pending} disabled={!strong} onClick={handleSave}>
                Şifreyi Kaydet & Bilgileri Gör
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
