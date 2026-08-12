import { type StaffMember } from '../domain/staff';

interface Props {
  members: StaffMember[];
  myUserId: string;
  onEdit: (m: StaffMember) => void;
  onResetPassword: (m: StaffMember) => void;
  onDelete: (m: StaffMember) => void;
}

const getInitials = (name: string) => (name ? name.substring(0, 2).toUpperCase() : '??');

export function StaffTable({ members, myUserId, onEdit, onResetPassword, onDelete }: Props) {
  if (members.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm italic text-slate-500 shadow-sm">
        Henüz personel tanımlanmamış.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm scrollbar-thin">
      <table className="w-full min-w-[960px] table-auto divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4">Ad Soyad</th>
            <th className="px-6 py-4">Kullanıcı Kodu</th>
            <th className="px-6 py-4">E-posta</th>
            <th className="px-6 py-4 text-center w-[180px]">Atanmış Bayi Sayısı</th>
            <th className="px-6 py-4 text-right w-[280px]">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {members.map((m) => {
            const isSelf = m.id === myUserId;
            return (
              <tr key={m.id} className="transition-colors hover:bg-slate-50/40">
                {/* Ad Soyad */}
                <td className="px-6 py-4.5 whitespace-nowrap align-middle">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center font-extrabold text-xs border border-blue-100 shadow-sm shrink-0">
                      {getInitials(m.fullName || '')}
                    </div>
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{m.fullName || '—'}</span>
                      {isSelf && (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                          Siz
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Kullanıcı Kodu */}
                <td className="px-6 py-4.5 whitespace-nowrap align-middle">
                  <div className="text-sm font-mono font-bold text-slate-700">
                    {m.userCode}
                  </div>
                </td>

                {/* E-posta */}
                <td className="px-6 py-4.5 whitespace-nowrap align-middle">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-650">
                    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                    <span>{m.email || '—'}</span>
                  </div>
                </td>

                {/* Atanmış Bayi Sayısı */}
                <td className="px-6 py-4.5 whitespace-nowrap text-center align-middle">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100/60 shadow-sm">
                    {m.scopeCount} Bayi
                  </span>
                </td>

                {/* İşlemler */}
                <td className="px-6 py-4.5 whitespace-nowrap text-right align-middle">
                  {!isSelf ? (
                    <div className="flex justify-end gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100/80 text-orange-700 border border-orange-100/60 text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetPassword(m)}
                        className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-700 border border-amber-100/60 text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.118 3.118 0 01-.78 1.767.75.75 0 00-.054 1.06c.494.56 1.227 1.033 2.144 1.254.893.214 1.932.102 2.953-.408a1.941 1.941 0 001.075-1.933 27.11 27.11 0 00.992-1.737c.738.232 1.506.387 2.29.462a.75.75 0 00.67-1.122C16.454 11.665 16 9.887 16 8a6 6 0 00-6-6zM8 8a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                        </svg>
                        Şifre Sıfırla
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(m)}
                        className="bg-white hover:bg-red-50 text-red-500 hover:text-red-700 p-2.5 rounded-xl border border-red-200 hover:border-red-300 transition-all hover:scale-105 active:scale-90 shadow-sm"
                        title="Personeli Sil"
                      >
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 italic">Değişiklik yapılamaz</span>
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
