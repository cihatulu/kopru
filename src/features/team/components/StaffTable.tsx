import { Button } from '@/components/ui/Button';
import { ROLE_LABEL, isEditable, needsScopeWarning, type StaffMember } from '../domain/staff';

interface Props {
  members: StaffMember[];
  myUserId: string;
  busyId: string | undefined;
  onScope: (m: StaffMember) => void;
  onToggleActive: (m: StaffMember) => void;
  onChangeRole: (m: StaffMember, role: 'staff' | 'accountant') => void;
}

export function StaffTable({
  members,
  myUserId,
  busyId,
  onScope,
  onToggleActive,
  onChangeRole,
}: Props) {
  if (members.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Ekipte kayıtlı kullanıcı yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Kişi</th>
            <th className="px-4 py-3">Kullanıcı kodu</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Müşteri kapsamı</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {members.map((m) => {
            const editable = isEditable(m, myUserId);
            const warn = needsScopeWarning(m);

            return (
              <tr key={m.id} className="text-slate-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{m.fullName ?? '—'}</p>
                  {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{m.userCode}</td>
                <td className="px-4 py-3">
                  {editable ? (
                    <select
                      className="input py-1 text-xs"
                      value={m.role}
                      aria-label={`${m.fullName ?? m.userCode} rolü`}
                      onChange={(e) =>
                        onChangeRole(m, e.target.value as 'staff' | 'accountant')
                      }
                    >
                      <option value="staff">{ROLE_LABEL.staff}</option>
                      <option value="accountant">{ROLE_LABEL.accountant}</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.role === 'staff' ? (
                    <span className={warn ? 'text-xs font-medium text-amber-700' : 'text-xs'}>
                      {warn ? 'Atanmamış — hiçbir müşteriyi göremez' : `${m.scopeCount} müşteri`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {m.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {m.role === 'staff' && (
                      <Button variant="secondary" onClick={() => onScope(m)}>
                        Müşteri ata
                      </Button>
                    )}
                    {editable && (
                      <Button
                        variant="ghost"
                        loading={busyId === m.id}
                        onClick={() => onToggleActive(m)}
                      >
                        {m.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      </Button>
                    )}
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
