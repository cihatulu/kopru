import { Button } from '@/components/ui/Button';
import type { Edge, Party } from '../domain/counterparty';

export interface SupplierRowActions {
  catalogPending: boolean;
  onToggleCatalog: (relationshipId: string, current: boolean) => void;
  onToggleStatus: (relationshipId: string, current: string) => void;
  onEdit: (edge: Edge, party: Party) => void;
  onResetPassword: (edge: Edge, party: Party) => void;
  onDelete: (relationshipId: string) => void;
}

interface Props extends SupplierRowActions {
  edge: Edge;
  party: Party;
}

const TD = 'px-5 py-4 text-sm whitespace-nowrap align-middle';

/** Üretici listesinin tek satırı. */
export function SupplierRow({ edge, party, catalogPending, ...on }: Props) {
  const initials = party.companyName.substring(0, 2).toUpperCase();
  // Alan boşsa izin verilmiş sayılır — eski ilişkilerde bu kolon yoktu.
  const canEdit = edge.canEditCatalog ?? true;

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className={TD}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block font-semibold text-slate-800 text-sm">
                {party.companyName}
              </span>
              {party.isSubscriber && (
                <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-200 px-1.5 py-0.5 text-[9px] font-bold text-brand-600 uppercase tracking-wide">
                  Üye
                </span>
              )}
            </div>
            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
              VKN: {party.vknTc}
            </span>
          </div>
        </div>
      </td>

      <td className={TD}>{party.authorizedName || '—'}</td>

      <td className={TD}>
        <div className="space-y-0.5 text-xs text-slate-500 font-medium">
          {party.email && <div>{party.email}</div>}
          {party.phone && <div>{party.phone}</div>}
        </div>
      </td>

      <td className={`${TD} text-center`}>
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          % {edge.discountRate || 0}
        </span>
      </td>

      <td className={`${TD} text-center`}>
        {/* Abone üretici kendi kataloğunu yönetir; izin anahtarı yalnız misafirde anlamlı. */}
        {party.isSubscriber ? (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-100">
            Üye yönetir
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => on.onToggleCatalog(edge.id, canEdit)}
              disabled={catalogPending}
              aria-label={canEdit ? 'Ürün yönetimini kapat' : 'Ürün yönetimini aç'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                canEdit ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  canEdit ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-[10px] font-bold ${canEdit ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {canEdit ? 'Açık' : 'Kapalı'}
            </span>
          </div>
        )}
      </td>

      <td className={`${TD} text-right pr-6`}>
        <div className="flex justify-end gap-2 text-xs font-medium">
          {/* Abone üreticinin kartını biz düzenleyemeyiz — kendi verisidir. */}
          {!party.isSubscriber && (
            <>
              <Button size="sm" variant="secondary" onClick={() => on.onEdit(edge, party)}>
                Düzenle
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => on.onResetPassword(edge, party)}
                className="border-yellow-200 bg-yellow-50/50 text-amber-700 hover:bg-yellow-50"
              >
                Şifre Sıfırla
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => on.onToggleStatus(edge.id, edge.status)}
            className={
              edge.status === 'active'
                ? 'border-red-200 text-red-600 hover:bg-red-50 font-bold'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold'
            }
          >
            {edge.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
          </Button>
          {/* Kural 16: silme yalnız pasifleştirilmiş kayıtta açılır. */}
          {edge.status !== 'active' && (
            <Button size="sm" variant="danger" onClick={() => on.onDelete(edge.id)}>
              Sil
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
