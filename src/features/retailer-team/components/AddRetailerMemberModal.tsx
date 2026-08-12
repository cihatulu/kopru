import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RETAILER_TEAM_ROLES, RETAILER_ROLE_LABELS } from '../domain/retailerTeam';
import { useAddRetailerMember } from '../api/useRetailerTeamMutations';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/constants';

interface Props {
  orgId: string;
  onClose: () => void;
}

export function AddRetailerMemberModal({ orgId, onClose }: Props) {
  const add = useAddRetailerMember();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'retailer_staff' | 'retailer_accountant'>('retailer_staff');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError('Ad Soyad en az 2 karakter olmalıdır.');
      return;
    }
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_REGEX.test(password)) {
      setError(`Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı, harf ve rakam içermeli.`);
      return;
    }
    add.mutate(
      { orgId, fullName: fullName.trim(), email: email.trim(), password, role },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Üye eklenemedi.') },
    );
  };

  return (
    <Modal label="Ekip Üyesi Ekle" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ekip Üyesi Ekle</h2>
          <p className="mt-1 text-sm text-slate-500">Yeni bir satış veya muhasebe personeli hesabı oluşturun.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Ad Soyad
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="Ad Soyad"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
            />
          </div>

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
              autoComplete="off"
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              className="input w-full"
              placeholder="En az 8 karakter, harf ve rakam içermeli"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {(error || add.isError) && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error ?? (add.error instanceof Error ? add.error.message : 'Üye eklenemedi.')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={add.isPending}>
              İptal
            </Button>
            <Button type="submit" loading={add.isPending}>
              Ekle
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
