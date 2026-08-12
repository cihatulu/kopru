import { Spinner } from '@/components/ui/Spinner';
import { otherParty, type Edge } from '../domain/counterparty';
import { SupplierRow, type SupplierRowActions } from './SupplierRow';

interface Props extends SupplierRowActions {
  edges: Edge[];
  myOrgId: string;
  loading: boolean;
}

const TH =
  'px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';

/** Perakendecinin üretici listesi. */
export function SupplierTable({ edges, myOrgId, loading, ...actions }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm min-h-[250px]">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : edges.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Gösterilecek üretici bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[800px] border-collapse text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={TH}>Firma Bilgisi</th>
                <th className={TH}>Yetkili</th>
                <th className={TH}>İletişim</th>
                <th className={`${TH} text-center`}>İndirim</th>
                <th className={`${TH} text-center`}>Ürün Yönetimi</th>
                <th className={`${TH} text-right pr-6`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {edges.map((edge) => (
                <SupplierRow
                  key={edge.id}
                  edge={edge}
                  party={otherParty(edge, myOrgId)}
                  {...actions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
