import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useStaffScope } from '../api/useStaff';
import type { StaffMember } from '../domain/staff';

interface Props {
  member: StaffMember;
  /** [orgId, firma adı] — org'un aktif müşterileri. */
  customers: [string, string][];
  pending: boolean;
  onClose: () => void;
  onSave: (retailerOrgIds: string[]) => void;
}

/**
 * Personelin görebileceği müşteriler.
 *
 * Kapsam boş bırakılırsa personel HİÇBİR müşteriyi göremez — "hepsi" değil.
 * Bu bilinçli: yeni personelin kazara tüm müşterilere erişmesi, hiç
 * erişememesinden çok daha kötü bir hatadır. Ekranda açıkça yazıyor.
 */
export function ScopeDialog({ member, customers, pending, onClose, onSave }: Props) {
  const scope = useStaffScope(member.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sunucudaki kapsam gelince seçimi bir kez doldur.
  useEffect(() => {
    if (scope.data) setSelected(new Set(scope.data));
  }, [scope.data]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Müşteri kapsamı"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Müşteri kapsamı</h2>
        <p className="mt-1 text-sm text-slate-500">
          {member.fullName ?? member.userCode} yalnız işaretlenen müşterilerin siparişlerini,
          carisini ve servis kayıtlarını görür.
        </p>

        {scope.isPending ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {customers.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                Henüz aktif müşteriniz yok.
              </p>
            )}
            {customers.map(([id, name]) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={selected.has(id)}
                  onChange={() => toggle(id)}
                />
                <span className="text-sm text-slate-700">{name}</span>
              </label>
            ))}
          </div>
        )}

        {selected.size === 0 && customers.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
            Hiçbir müşteri seçili değil. Bu şekilde kaydederseniz personel hiçbir müşteriyi
            göremez.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button loading={pending} onClick={() => onSave([...selected])}>
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
