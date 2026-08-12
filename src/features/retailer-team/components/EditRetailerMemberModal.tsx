import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RETAILER_TEAM_ROLES, RETAILER_ROLE_LABELS } from '../domain/retailerTeam';
import { useUpdateRetailerMemberRole, useUpdateRetailerMemberPassword } from '../api/useRetailerTeamMutations';
import type { RetailerTeamMember } from '../api/model';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/constants';

interface Props {
  member: RetailerTeamMember;
  onClose: () => void;
}

export function EditRetailerMemberModal({ member, onClose }: Props) {
  const updateRole = useUpdateRetailerMemberRole();
  const updatePassword = useUpdateRetailerMemberPassword();
  
  const [role, setRole] = useState<RetailerTeamMember['role']>(member.role);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password && (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_REGEX.test(password))) {
      setError(`Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı, harf ve rakam içermeli.`);
      return;
    }

    try {
      if (role !== member.role) {
        await updateRole.mutateAsync({ id: member.id, orgId: member.orgId, role });
      }
      if (password) {
        await updatePassword.mutateAsync({ id: member.id, orgId: member.orgId, password });
      }
      onClose();
    } catch {
      setError('Güncelleme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <Modal label="Üye Düzenle" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Üye Düzenle</h2>
          <p className="mt-1 text-sm text-slate-500">{member.email}</p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Rol
            </label>
            <select
              className="input w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as RetailerTeamMember['role'])}
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
              Yeni Şifre (Değiştirmek için)
            </label>
            <input
              type="password"
              className="input w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Sadece şifreyi değiştirmek istiyorsanız doldurun.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose} disabled={updateRole.isPending || updatePassword.isPending}>
              İptal
            </Button>
            <Button type="submit" loading={updateRole.isPending || updatePassword.isPending}>
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
