import { otherParty, type Edge } from '../domain/counterparty';

interface Props {
  edges: Edge[];
  myOrgId: string;
  busyId: string | undefined;
  onEdit: (e: Edge) => void;
  onResetPassword: (e: Edge) => void;
  onToggleActive: (e: Edge) => void;
}

const TH = 'px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500';

/** Baş harflerden avatar — firma adı yoksa yer tutucu. */
function initials(name: string): string {
  return name ? name.substring(0, 2).toLocaleUpperCase('tr') : '??';
}

export function CustomerTable({
  edges,
  myOrgId,
  busyId,
  onEdit,
  onResetPassword,
  onToggleActive,
}: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xl">
      <table className="min-w-[980px] divide-y divide-slate-100 lg:w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className={TH}>Firma Bilgisi</th>
            <th className={TH}>Yetkili</th>
            <th className={TH}>İletişim</th>
            <th className={`${TH} w-24 text-center`}>İndirim</th>
            <th className={`${TH} w-[300px] text-right`}>İşlemler</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {edges.length === 0 && (
            <tr>
              <td colSpan={5} className="py-16 text-center text-sm italic text-slate-400">
                Bu görünümde müşteri yok.
              </td>
            </tr>
          )}

          {edges.map((edge) => {
            const p = otherParty(edge, myOrgId);
            const active = edge.status === 'active';
            // Abone müşterinin kartı ve şifresi KENDİSİNE aittir.
            const managed = !p.isSubscriber;

            return (
              <tr
                key={edge.id}
                className={`transition-colors hover:bg-slate-50/40 ${active ? '' : 'bg-slate-50/40 opacity-70'}`}
              >
                <td className="whitespace-nowrap px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-xs font-extrabold text-blue-600 shadow-sm">
                      {initials(p.companyName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{p.companyName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Kodu: #{p.vknTc}
                        {p.isSubscriber && (
                          <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            ÜYE
                          </span>
                        )}
                        {!active && (
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            PASİF
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-slate-700">
                  {p.authorizedName ?? '—'}
                </td>

                <td className="whitespace-nowrap px-6 py-5 text-sm">
                  <p className="text-slate-600">{p.email ?? '—'}</p>
                  <p className="mt-0.5 text-slate-500">{p.phone ?? '—'}</p>
                </td>

                <td className="whitespace-nowrap px-6 py-5 text-center">
                  <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    % {edge.discountRate}
                  </span>
                </td>

                <td className="whitespace-nowrap px-6 py-5">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Action
                      label="Düzenle"
                      tone="amber"
                      disabled={!managed}
                      title={managed ? undefined : 'Abone firmanın kartını yalnız kendisi düzenler'}
                      onClick={() => onEdit(edge)}
                    />
                    <Action
                      label="Şifre Sıfırla"
                      tone="amber"
                      disabled={!managed}
                      title={managed ? undefined : 'Abone firmanın şifresini yalnız kendisi değiştirir'}
                      onClick={() => onResetPassword(edge)}
                    />
                    <Action
                      label={active ? 'Pasif Yap' : 'Aktif Yap'}
                      tone="plain"
                      disabled={busyId === edge.id}
                      onClick={() => onToggleActive(edge)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Action({
  label,
  tone,
  disabled,
  title,
  onClick,
}: {
  label: string;
  tone: 'amber' | 'plain';
  disabled?: boolean;
  title?: string | undefined;
  onClick: () => void;
}) {
  const base =
    'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40';
  const skin =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

  return (
    <button type="button" disabled={disabled} title={title} onClick={onClick} className={`${base} ${skin}`}>
      {label}
    </button>
  );
}
