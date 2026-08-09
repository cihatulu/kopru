import type { OrgKind } from '@/constants';
import {
  verdictMessage,
  verdictTone,
  type LookupVerdict,
  type OrgLookup,
} from '../domain/vknLookup';

const TONE = {
  info: 'bg-blue-50 text-blue-800 ring-blue-200',
  warn: 'bg-amber-50 text-amber-900 ring-amber-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
} as const;

/**
 * VKN yazıldıkça ne olacağını söyleyen uyarı.
 *
 * Bu, A3'ün (VKN yakınsama anahtarı) kullanıcıya görünen yüzü: numara zaten
 * kayıtlıysa yeni kayıt AÇILMAZ, mevcut kayda bağlanılır. Kullanıcı bunu
 * kaydetmeden önce bilmezse, karşısına çıkan farklı firma adını hata sanar.
 */
export function VknNotice({
  verdict,
  lookup,
  myKind,
  loading,
}: {
  verdict: LookupVerdict;
  lookup: OrgLookup | null;
  myKind: OrgKind;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        Vergi numarası kontrol ediliyor…
      </p>
    );
  }

  const tone = verdictTone(verdict);
  if (tone === 'none') return null;

  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ring-1 ring-inset ${TONE[tone]}`}
    >
      {verdictMessage(verdict, lookup, myKind)}
      {(verdict === 'new' || verdict === 'existing-guest') && (
        <span className="mt-1 block font-semibold">
          Cari hesap kaydedildiği anda ₺0 bakiyeyle açılır.
        </span>
      )}
      {verdict === 'existing-subscriber' && (
        <span className="mt-1 block font-semibold">
          Cari hesap, karşı taraf onayladığında otomatik açılır.
        </span>
      )}
    </p>
  );
}
