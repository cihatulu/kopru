interface Props {
  userCode: string;
  password: string;
  passwordRepeat: string;
  onUserCode: (v: string) => void;
  onPassword: (v: string) => void;
  onPasswordRepeat: (v: string) => void;
}

/**
 * Müşterinin giriş bilgileri.
 *
 * Yalnız hesabı OLMAYAN bir firma eklenirken gösterilir; zaten girişi olan
 * bir firmaya şifre sormak, kullanıcıya "yeni şifre belirledim" yanılgısı
 * yaşatırdı — oysa o hesap bu ekrandan değişmez.
 */
export function CredentialFields({
  userCode,
  password,
  passwordRepeat,
  onUserCode,
  onPassword,
  onPasswordRepeat,
}: Props) {
  const mismatch = password.length > 0 && password !== passwordRepeat;

  return (
    <>
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
        Müşterinin sisteme giriş yapacağı bilgiler:
      </div>

      <label className="block">
        <span className="label">Kullanıcı Kodu (Giriş ID)</span>
        <input className="input" value={userCode} onChange={(e) => onUserCode(e.target.value.toLowerCase())} />
        <p className="mt-1 text-xs text-slate-500">
          Vergi numarasından otomatik dolar; isterseniz değiştirebilirsiniz. Küçük harf ve rakam,
          3-32 karakter.
        </p>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Şifre</span>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Şifre Tekrar</span>
          <input
            type="password"
            className="input"
            value={passwordRepeat}
            onChange={(e) => onPasswordRepeat(e.target.value)}
          />
        </label>
      </div>

      {mismatch && <p className="field-error">Şifreler eşleşmiyor.</p>}
      <p className="text-xs text-slate-500">
        En az 8 karakter, en az bir harf ve bir rakam içermelidir.
      </p>
    </>
  );
}
