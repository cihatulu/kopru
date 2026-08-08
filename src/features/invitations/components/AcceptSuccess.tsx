import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import type { AcceptResult } from '../api/useInviteAcceptance';

/**
 * Kayıt sonrası ekran.
 *
 * Burada oturum AÇILMAZ — kullanıcı giriş ekranından kendi belirlediği şifreyle
 * girer. Sebep: yeni hesap MİSAFİRdir ve misafir girişi sponsor vergi numarası
 * ister; o numarayı burada açıkça göstermek, kullanıcının ilk girişte
 * takılmasını engelleyen tek şey.
 */
export function AcceptSuccess({
  result,
  inviterName,
}: {
  result: AcceptResult;
  inviterName: string;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">Hesabınız hazır</h2>
        <p className="mt-1 text-sm text-slate-500">
          {inviterName} ile bağlantınız kuruldu.
        </p>
      </div>

      {result.accountCreated ? (
        <div className="rounded-lg bg-slate-50 p-4 text-left ring-1 ring-inset ring-slate-200">
          <p className="text-xs font-medium text-slate-600">
            Giriş ekranında <strong>MİSAFİR</strong> sekmesini kullanın:
          </p>
          <dl className="mt-3 space-y-1.5 font-mono text-sm text-slate-800">
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-slate-500">Sizi ekleyenin vergi no</dt>
              <dd className="font-semibold">{result.sponsorVkn}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-slate-500">Kullanıcı kodunuz</dt>
              <dd className="font-semibold">{result.userCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-slate-500">Şifre</dt>
              <dd className="font-sans text-xs text-slate-500">az önce belirlediğiniz</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu firmanın girişi zaten vardı; şifreniz değiştirilmedi. Mevcut şifrenizle giriş
          yapabilirsiniz — bağlantı kuruldu.
        </p>
      )}

      <Link
        to={ROUTES.login}
        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Giriş ekranına git
      </Link>
    </div>
  );
}
