import { TH, THEAD } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { LEAD_STATUS_META, isClosedLead, nextLeadStatus } from '../domain/lead';
import type { Lead } from '../api/useLeads';

interface Props {
  leads: Lead[];
  busyId?: string | undefined;
  onAdvance: (l: Lead) => void;
  onReject: (l: Lead) => void;
  onConvertToOrg?: (l: Lead) => void;
}

const TD = 'px-4 py-3 align-middle';

export function LeadTable({ leads, busyId, onAdvance, onReject, onConvertToOrg }: Props) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Aday kaydı yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Firma</th>
            <th className={TH}>İletişim</th>
            <th className={TH}>Durum</th>
            <th className={TH}>Eklendi</th>
            <th className={`${TH} text-right`}>İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((l) => {
            const meta = LEAD_STATUS_META[l.status];
            const next = nextLeadStatus(l.status);
            return (
              <tr key={l.id} className="hover:bg-slate-50/60">
                <td className={TD}>
                  <span className="block font-medium text-slate-900">{l.companyName}</span>
                  <span className="block text-xs text-slate-500">
                    {l.vknTc ? `${l.vknTc} · ` : ''}
                    {l.city ?? '—'}
                    {l.kind && ` · ${l.kind === 'manufacturer' ? 'Üretici' : 'Perakendeci'}`}
                  </span>
                </td>
                <td className={`${TD} text-xs text-slate-600`}>
                  {l.phone ?? '—'}
                  {l.email && <span className="block">{l.email}</span>}
                </td>
                <td className={TD}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                  {l.matchedOrgId && (
                    <span className="mt-1 block text-xs text-emerald-700 font-semibold">✓ Sisteme kayıtlı</span>
                  )}
                </td>
                <td className={`${TD} text-xs text-slate-500`}>{formatDate(l.createdAt)}</td>
                <td className={`${TD} text-right`}>
                  {!isClosedLead(l.status) && (
                    <div className="inline-flex items-center gap-1.5">
                      {onConvertToOrg && (
                        <button
                          type="button"
                          onClick={() => onConvertToOrg(l)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <span>+</span>
                          <span>
                            {l.kind === 'manufacturer'
                              ? 'Üretici Ekle'
                              : l.kind === 'retailer'
                                ? 'Perakendeci Ekle'
                                : 'Üye Yap'}
                          </span>
                        </button>
                      )}
                      {next && (
                        <Button loading={busyId === l.id} onClick={() => onAdvance(l)}>
                          {LEAD_STATUS_META[next].label}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        disabled={busyId === l.id}
                        onClick={() => onReject(l)}
                      >
                        Olumsuz
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
