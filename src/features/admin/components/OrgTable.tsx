import { Button } from '@/components/ui/Button';
import { ActiveBadge, SubscriberBadge } from './StatusBadges';
import type { AdminOrg } from '../api/useOrgList';

interface Props {
  orgs: AdminOrg[];
  busyId?: string | undefined;
  onUpgrade: (org: AdminOrg) => void;
  onDowngrade: (org: AdminOrg) => void;
  onToggleActive: (org: AdminOrg) => void;
}

const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-500';
const TD = 'px-4 py-3 align-middle';

export function OrgTable({ orgs, busyId, onUpgrade, onDowngrade, onToggleActive }: Props) {
  if (orgs.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Kayıt bulunamadı.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Firma</th>
            <th className={TH}>VKN / T.C.</th>
            <th className={TH}>Durum</th>
            <th className={TH}>İlişki</th>
            <th className={TH}>Subdomain</th>
            <th className={`${TH} text-right`}>İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orgs.map((org) => (
            <tr key={org.id} className="hover:bg-slate-50/60">
              <td className={TD}>
                <span className="block font-medium text-slate-900">{org.companyName}</span>
                {org.authorizedName && (
                  <span className="block text-xs text-slate-500">{org.authorizedName}</span>
                )}
              </td>
              <td className={`${TD} font-mono text-xs text-slate-600`}>{org.vknTc}</td>
              <td className={TD}>
                <div className="flex flex-wrap gap-1.5">
                  <SubscriberBadge isSubscriber={org.isSubscriber} plan={org.plan} />
                  <ActiveBadge isActive={org.isActive} />
                </div>
              </td>
              <td className={`${TD} text-slate-600`}>{org.relationshipCount}</td>
              <td className={`${TD} text-xs text-slate-500`}>{org.subdomain ?? '—'}</td>
              <td className={`${TD} text-right`}>
                <div className="inline-flex gap-1.5">
                  {org.isSubscriber ? (
                    <Button
                      variant="ghost"
                      loading={busyId === org.id}
                      onClick={() => onDowngrade(org)}
                    >
                      Misafire düşür
                    </Button>
                  ) : (
                    <Button loading={busyId === org.id} onClick={() => onUpgrade(org)}>
                      Aboneye yükselt
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => onToggleActive(org)}>
                    {org.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
