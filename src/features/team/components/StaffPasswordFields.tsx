import { useState } from 'react';
import { PASSWORD_MIN_LENGTH } from '@/constants';

const INPUT =
  'w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium';
const LABEL = 'block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5';

interface Props {
  password: string;
  passwordConfirm: string;
  disabled: boolean;
  onChange: (field: 'password' | 'passwordConfirm', value: string) => void;
}

/** Yeni personelin şifresi. Düzenleme kipinde HİÇ gösterilmez (kilitli kural 2). */
export function StaffPasswordFields({ password, passwordConfirm, disabled, onChange }: Props) {
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Giriş kodu küçük harfe göre kurgulandığı için şifrede büyük harf kabul edilmez.
  const strip = (v: string) => v.replace(/[A-Z]/g, '');
  const watchCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLockOn(e.getModifierState('CapsLock') || e.getModifierState('Shift'));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={LABEL}>Şifre *</label>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          disabled={disabled}
          onChange={(e) => onChange('password', strip(e.target.value))}
          onKeyUp={watchCaps}
          className={INPUT}
          required
        />
        {capsLockOn && (
          <p className="mt-1 text-[10px] text-yellow-600 font-bold">
            ⚠️ Büyük harf kilidi açık — büyük harf kullanamazsınız.
          </p>
        )}
        <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400 font-medium">
          En az {PASSWORD_MIN_LENGTH} karakter, en az bir harf ve bir rakam içermelidir.
          Noktalama işaretleri kullanılabilir.
        </p>
      </div>

      <div>
        <label className={LABEL}>Şifre Tekrar *</label>
        <input
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          value={passwordConfirm}
          disabled={disabled}
          onChange={(e) => onChange('passwordConfirm', strip(e.target.value))}
          onKeyUp={watchCaps}
          className={INPUT}
          required
        />
      </div>
    </div>
  );
}
