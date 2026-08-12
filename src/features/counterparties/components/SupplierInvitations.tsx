import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { inviteState, inviteUrl, type Invitation } from '@/features/invitations';

interface Props {
  invitations: Invitation[];
  loading: boolean;
  revoking: boolean;
  onRevoke: (invitationId: string) => void;
}

const TH = 'px-5 py-3.5';
const STATE_STYLE: Record<string, string> = {
  used: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  revoked: 'bg-rose-50 text-rose-700 border border-rose-100',
  expired: 'bg-rose-50 text-rose-700 border border-rose-100',
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
};
const STATE_LABEL: Record<string, string> = {
  used: 'Kullanıldı',
  revoked: 'İptal Edildi',
  expired: 'Süresi Doldu',
  pending: 'Beklemede',
};

/** WhatsApp üzerinden gönderilen üretici davetlerinin listesi. */
export function SupplierInvitations({ invitations, loading, revoking, onRevoke }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (token: string, id: string) => {
    void navigator.clipboard.writeText(inviteUrl(token, window.location.origin)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-3 pt-6 border-t border-slate-100">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        WhatsApp Üretici Davetleri
      </h2>

      {loading ? (
        <Spinner />
      ) : invitations.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-400">
          Gösterilecek davet bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm w-full">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className={TH}>Davet Edilen Telefon</th>
                <th className={TH}>Davet Kodu</th>
                <th className={TH}>Tarih</th>
                <th className={`${TH} text-center`}>Durum</th>
                <th className={`${TH} text-right pr-6`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv) => {
                const state = inviteState(inv);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {inv.phone || inv.email || '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      {inv.token.substring(0, 8)}...
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(inv.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[state] ?? ''}`}
                      >
                        {STATE_LABEL[state] ?? state}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right pr-6">
                      <div className="flex justify-end gap-2 text-xs font-medium">
                        {state === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyLink(inv.token, inv.id)}
                              className="text-xs font-bold"
                            >
                              {copiedId === inv.id ? 'Kopyalandı!' : 'Linki Kopyala'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onRevoke(inv.id)}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                              disabled={revoking}
                            >
                              İptal Et
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
