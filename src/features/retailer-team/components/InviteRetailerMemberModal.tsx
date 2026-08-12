import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RETAILER_TEAM_ROLES, RETAILER_ROLE_LABELS } from '../domain/retailerTeam';
import { useInviteRetailerMember } from '../api/useRetailerTeamMutations';

interface Props {
  orgId: string;
  onClose: () => void;
}

export function InviteRetailerMemberModal({ orgId, onClose }: Props) {
  const invite = useInviteRetailerMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'retailer_staff' | 'retailer_accountant'>('retailer_staff');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    invite.mutate(
      { orgId, email: email.trim(), role },
      {
        onSuccess: ({ token }) => {
          setInviteLink(`${window.location.origin}/davet/${token}`);
        },
        onError: () => setError('Davet oluşturulamadı. Tekrar deneyin.'),
      },
    );
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (inviteLink) {
    return (
      <Modal label="Davet Linki Hazır" onClose={onClose}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Davet Linki Hazır</h2>
            <p className="mt-1 text-sm text-slate-500">
              Aşağıdaki linki kopyalayıp davet ettiğiniz kişiyle paylaşın. Link 7 gün geçerlidir.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="flex-1 truncate text-xs text-slate-700">{inviteLink}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
          </div>
          <Button className="w-full" variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal label="Davet Gönder" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Davet Gönder</h2>
          <p className="mt-1 text-sm text-slate-500">Ekibe davet linki ile yeni üye ekleyin.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              className="input w-full"
              placeholder="ornek@sirket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Rol
            </label>
            <select
              className="input w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              {RETAILER_TEAM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {RETAILER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={invite.isPending}>
              İptal
            </Button>
            <Button type="submit" loading={invite.isPending}>
              Davet Linki Oluştur
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
