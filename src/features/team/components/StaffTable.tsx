import { type StaffMember } from '../domain/staff';

interface Props {
  members: StaffMember[];
  myUserId: string;
  onEdit: (m: StaffMember) => void;
  onResetPassword: (m: StaffMember) => void;
  onDelete: (m: StaffMember) => void;
}

const getInitials = (name: string) => (name ? name.substring(0, 2).toUpperCase() : '??');

/** Ekip (Personel) tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function StaffTable({ members, myUserId, onEdit, onResetPassword, onDelete }: Props) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-14 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-400 mb-2.5 border border-slate-200/60 shadow-2xs">
          <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-400">Henüz personel tanımlanmamış.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {members.map((m) => {
          const isSelf = m.id === myUserId;

          return (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Avatar + Ad Soyad + Kullanıcı Kodu + Bayi Rozeti */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs border border-blue-100 shadow-2xs shrink-0">
                    {getInitials(m.fullName || '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate" title={m.fullName || ''}>
                        {m.fullName || '—'}
                      </span>
                      {isSelf && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                          Siz
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs font-bold text-slate-500">
                      Kod: #{m.userCode}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100/60 shadow-2xs shrink-0">
                  {m.scopeCount} Bayi
                </span>
              </div>

              {/* Kart Gövdesi: E-posta Bilgisi */}
              <div className="py-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    E-Posta:
                  </span>
                  <span className="font-semibold text-slate-800 truncate" title={m.email || '—'}>
                    {m.email || '—'}
                  </span>
                </div>
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                {!isSelf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetPassword(m)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Şifre Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      Sil
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-400 italic">Kendi hesabınız</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full min-w-[960px] table-auto divide-y divide-slate-100 text-xs">
          <thead className="bg-slate-50/80 text-left font-extrabold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-3.5">Ad Soyad</th>
              <th className="px-6 py-3.5">Kullanıcı Kodu</th>
              <th className="px-6 py-3.5">E-posta</th>
              <th className="px-6 py-3.5 text-center w-[180px]">Atanmış Bayi Sayısı</th>
              <th className="px-6 py-3.5 text-right w-[280px]">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
            {members.map((m) => {
              const isSelf = m.id === myUserId;
              return (
                <tr key={m.id} className="transition-colors hover:bg-slate-50/40">
                  <td className="px-6 py-3.5 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs border border-blue-100 shadow-xs shrink-0">
                        {getInitials(m.fullName || '')}
                      </div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{m.fullName || '—'}</span>
                        {isSelf && (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                            Siz
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 whitespace-nowrap align-middle">
                    <div className="font-mono font-bold text-slate-700">
                      {m.userCode}
                    </div>
                  </td>

                  <td className="px-6 py-3.5 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <svg className="size-3.5 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                        <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                      </svg>
                      <span>{m.email || '—'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 whitespace-nowrap text-center align-middle">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs">
                      {m.scopeCount} Bayi
                    </span>
                  </td>

                  <td className="px-6 py-3.5 whitespace-nowrap text-right align-middle">
                    {!isSelf ? (
                      <div className="flex justify-end gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => onEdit(m)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => onResetPassword(m)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          Şifre Sıfırla
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(m)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Personeli Sil"
                        >
                          Sil
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">Değişiklik yapılamaz</span>
                    )}
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
