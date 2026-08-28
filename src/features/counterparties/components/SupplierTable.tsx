import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { otherParty, type Edge } from '../domain/counterparty';
import { SupplierRow, type SupplierRowActions } from './SupplierRow';

interface Props extends SupplierRowActions {
  edges: Edge[];
  myOrgId: string;
  loading: boolean;
}

const TH =
  'px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';

/** Perakendecinin üretici listesi — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function SupplierTable({ edges, myOrgId, loading, ...actions }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (edges.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center py-12 text-slate-400 text-xs font-semibold">
        Gösterilecek üretici bulunmuyor.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {edges.map((edge) => {
          const party = otherParty(edge, myOrgId);
          const initials = party.companyName.substring(0, 2).toUpperCase();
          const canEdit = edge.canEditCatalog ?? true;
          const active = edge.status === 'active';

          return (
            <div
              key={edge.id}
              className={`rounded-2xl border p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80 ${
                active ? 'border-slate-200/90 bg-white' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              {/* Kart Başlığı: Avatar + Firma Adı + VKN + İskonto */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate" title={party.companyName}>
                        {party.companyName}
                      </span>
                      {party.isSubscriber && (
                        <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.2 text-[9px] font-bold text-brand-600 uppercase">
                          Üye
                        </span>
                      )}
                      {!active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                          PASİF
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">VKN: {party.vknTc}</p>
                  </div>
                </div>

                <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 shrink-0">
                  % {edge.discountRate || 0} İndirim
                </span>
              </div>

              {/* Kart Gövdesi: Yetkili, İletişim & Ürün Yönetimi İzni */}
              <div className="grid grid-cols-2 gap-2.5 py-3 text-xs bg-slate-50/60 rounded-xl p-2.5 my-3 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Yetkili
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 truncate" title={party.authorizedName || '—'}>
                    {party.authorizedName || '—'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Telefon
                  </span>
                  <span className="font-bold text-slate-700 block mt-0.5 truncate" title={party.phone || '—'}>
                    {party.phone || '—'}
                  </span>
                </div>

                {/* Ürün Yönetimi İzin Anahtarı */}
                <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ürün Yönetimi İzni
                  </span>
                  {party.isSubscriber ? (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Üye kendi yönetir
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => actions.onToggleCatalog(edge.id, canEdit)}
                      disabled={actions.catalogPending}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-colors ${
                        canEdit
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <span className={`size-2 rounded-full ${canEdit ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span>{canEdit ? 'İzin Açık' : 'İzin Kapalı'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {!party.isSubscriber && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => actions.onEdit(edge, party)} className="text-xs">
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => actions.onResetPassword(edge, party)}
                      className="text-xs border-yellow-200 bg-yellow-50/50 text-amber-700 hover:bg-yellow-50"
                    >
                      Şifre Sıfırla
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => actions.onToggleStatus(edge.id, edge.status)}
                  className={`text-xs ${
                    active
                      ? 'border-red-200 text-red-600 hover:bg-red-50 font-bold'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold'
                  }`}
                >
                  {active ? 'Pasif Yap' : 'Aktif Yap'}
                </Button>

                {!active && (
                  <Button size="sm" variant="danger" onClick={() => actions.onDelete(edge.id)} className="text-xs">
                    Sil
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm">
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
      </div>
    </div>
  );
}
