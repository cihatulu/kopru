import { useAuthSession } from '@/features/auth';
import { ORG_KIND } from '@/constants';

/**
 * GEÇİCİ panel özeti — katalog/sipariş modülleri Faz 6'da gelecek.
 * Başlık ve çıkış butonu PanelLayout'ta; burada tekrarlanmaz.
 */
export function PanelPlaceholder({ title }: { title: string }) {
  const { data: user } = useAuthSession();
  const org = user?.org;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Katalog, sipariş ve cari modülleri Faz 6&apos;da eklenecek.
        </p>
      </div>

      <dl className="grid gap-3 rounded-xl bg-white p-5 text-sm ring-1 ring-inset ring-slate-200">
        <Row
          label="Üyelik tipi"
          value={org?.kind === ORG_KIND.manufacturer ? 'Üretici' : 'Perakendeci'}
        />
        <Row
          label="Hizmet durumu"
          value={
            org?.isSubscriber
              ? `Abone (${org.plan ?? '—'})`
              : 'Misafir — bir abone tarafından eklenmiş'
          }
        />
        <Row label="VKN / T.C." value={org?.vknTc ?? '—'} />
        <Row label="Yetki" value={user?.orgRole ?? '—'} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
