import { TH, THEAD } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { otherParty, type Edge } from '../domain/counterparty';

interface Props {
  edges: Edge[];
  myOrgId: string;
  busyId: string | undefined;
  onEdit: (e: Edge) => void;
  onResetPassword: (e: Edge) => void;
  onToggleActive: (e: Edge) => void;
  onDelete?: (e: Edge) => void;
}

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
  onDelete,
}: Props) {
  if (edges.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Bu görünümde müşteri bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {edges.map((edge) => {
          const p = otherParty(edge, myOrgId);
          const active = edge.status === 'active';
          const managed = !p.isSubscriber;

          return (
            <div
              key={edge.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Avatar + Firma Adı + VKN + İskonto */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-extrabold text-blue-600 shadow-2xs">
                    {initials(p.companyName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate" title={p.companyName}>
                        {p.companyName}
                      </span>
                      {p.isSubscriber && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/70 px-2 py-0.2 text-[10px] font-bold text-emerald-700">
                          ÜYE
                        </span>
                      )}
                      {!active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                          PASİF
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">Kodu: #{p.vknTc}</p>
                  </div>
                </div>

                {/* İndirim Rozeti */}
                <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 shrink-0">
                  % {edge.discountRate} İndirim
                </span>
              </div>

              {/* Kart Gövdesi: Yetkili & İletişim */}
              <div className="grid grid-cols-2 gap-2.5 py-3 text-xs bg-slate-50/60 rounded-xl p-2.5 my-3 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Yetkili
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 truncate" title={p.authorizedName ?? '—'}>
                    {p.authorizedName ?? '—'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Telefon
                  </span>
                  <span className="font-bold text-slate-700 block mt-0.5 truncate" title={p.phone ?? '—'}>
                    {p.phone ?? '—'}
                  </span>
                </div>

                {p.email && (
                  <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      E-Posta
                    </span>
                    <span className="font-medium text-slate-600 truncate max-w-[200px]" title={p.email}>
                      {p.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {managed && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(edge)}
                      className="text-xs"
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onResetPassword(edge)}
                      className="text-xs"
                    >
                      Şifre Sıfırla
                    </Button>
                  </>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === edge.id}
                  onClick={() => onToggleActive(edge)}
                  className="text-xs"
                >
                  {active ? 'Pasif Yap' : 'Aktif Yap'}
                </Button>

                {!active && onDelete && (
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    disabled={busyId === edge.id}
                    onClick={() => onDelete(edge)}
                    className="text-xs"
                  >
                    Sil
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="min-w-[980px] divide-y divide-slate-100 lg:w-full text-xs">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Firma Bilgisi</th>
              <th className={TH}>Yetkili</th>
              <th className={TH}>İletişim</th>
              <th className={`${TH} w-24 text-center`}>İndirim</th>
              <th className={`${TH} w-[300px] text-right`}>İşlemler</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {edges.map((edge) => {
              const p = otherParty(edge, myOrgId);
              const active = edge.status === 'active';
              const managed = !p.isSubscriber;

              return (
                <tr
                  key={edge.id}
                  className={`transition-colors hover:bg-slate-50/40 ${active ? '' : 'bg-slate-50/40 opacity-70'}`}
                >
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-extrabold text-blue-600 shadow-xs">
                        {initials(p.companyName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">{p.companyName}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Kodu: #{p.vknTc}
                          {p.isSubscriber && (
                            <span className="ml-2 rounded-full bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                              ÜYE
                            </span>
                          )}
                          {!active && (
                            <span className="ml-2 rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                              PASİF
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-6 py-3.5 text-xs font-bold text-slate-800">
                    {p.authorizedName ?? '—'}
                  </td>

                  <td className="whitespace-nowrap px-6 py-3.5 text-xs">
                    <p className="text-slate-700 font-medium">{p.email ?? '—'}</p>
                    <p className="mt-0.5 text-slate-400">{p.phone ?? '—'}</p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-3.5 text-center">
                    <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                      % {edge.discountRate}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-3.5">
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
                      {!active && onDelete && (
                        <Action
                          label="Sil"
                          tone="red"
                          disabled={busyId === edge.id}
                          onClick={() => onDelete(edge)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  tone: 'amber' | 'plain' | 'red';
  disabled?: boolean;
  title?: string | undefined;
  onClick: () => void;
}) {
  return (
    <Button
      variant={tone === 'red' ? 'dangerGhost' : 'secondary'}
      size="sm"
      disabled={disabled ?? false}
      {...(title ? { title } : {})}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
