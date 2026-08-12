import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { StaffMember } from '../domain/staff';

interface Props {
  staff: StaffMember;
  pending: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => void;
}

export function ResetPasswordForm({ staff, pending, onClose, onSave }: Props) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password !== passwordConfirm) {
      setError('Şifreler uyuşmuyor veya boş bırakılamaz.');
      return;
    }

    if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Şifre en az 6 karakter, en az bir harf ve bir rakam içermelidir.');
      return;
    }

    onSave(password);
  };

  return (
    <Modal
      label={`Şifre Sıfırla: ${staff.fullName}`}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
      onClose={onClose}
      closeDisabled={pending}
    >
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H17a2 2 0 01-2-2V7zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H16a2 2 0 01-2-2v-2z" />
        </svg>
        <h3 className="text-sm font-bold text-slate-800">
          Şifre Sıfırla: {staff.fullName || staff.userCode}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-100">
            {error}
          </div>
        )}

        <p className="text-xs text-slate-650 leading-relaxed">
          <strong className="text-slate-800">{staff.fullName}</strong> adlı personel için yeni bir şifre belirleyin.
        </p>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Yeni Şifre *
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={pending}
            onChange={(e) => setPassword(e.target.value.replace(/[A-Z]/g, ''))}
            onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock') || e.getModifierState('Shift'))}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
            required
          />
          {capsLockOn && (
            <p className="mt-1.5 text-xs text-yellow-600 font-bold">
              ⚠️ Büyük harf kilidi açık — büyük harf kullanamazsınız.
            </p>
          )}
          <p className="mt-1 text-[9px] text-slate-400 font-medium leading-relaxed">
            En az 6 karakter, en az bir harf ve bir rakam içermelidir. Noktalama işaretleri kullanılabilir.
          </p>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Yeni Şifre Tekrar *
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            disabled={pending}
            onChange={(e) => setPasswordConfirm(e.target.value.replace(/[A-Z]/g, ''))}
            onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock') || e.getModifierState('Shift'))}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" loading={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
