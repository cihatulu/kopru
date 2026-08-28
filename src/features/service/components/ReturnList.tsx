import { useState } from 'react';
import { formatDateTime, formatMoney } from '@/lib/format';
import { RETURN_STATUS_META } from '../domain/labels';
import type { ReturnRequest } from '../api/useReturnRequests';
import { ReturnDetailModal } from './ReturnDetailModal';
import { Button } from '@/components/ui/Button';

interface Props {
  requests: ReturnRequest[];
  myOrgId: string;
  isManufacturer?: boolean;
  busyId?: string | undefined;
  onDecide: (r: ReturnRequest, approve: boolean) => void;
}

export function ReturnList({ requests, myOrgId, isManufacturer = false, busyId, onDecide }: Props) {
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-14 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-400 mb-2.5 border border-slate-200/60 shadow-2xs">
          <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-400">Henüz gösterilecek iade talebi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
        <div className="space-y-3.5 md:hidden">
          {requests.map((r) => {
            const meta = RETURN_STATUS_META[r.status];
            const totalQty = r.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
              >
                {/* Kart Başlığı: Sipariş No & Durum Rozeti */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-black text-slate-900 tracking-tight">
                      {r.orderNo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 font-medium">
                      {formatDateTime(r.createdAt)}
                    </p>
                  </div>

                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border shrink-0 ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Kart Gövdesi: Tam Simetrik 2 Sütunlu Izgara */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                  {/* Sol Üst: Firma Adı */}
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isManufacturer ? 'Perakendeci' : 'Üretici'}
                    </span>
                    <span className="font-extrabold text-slate-900 truncate block mt-0.5" title={r.counterpartyName}>
                      {r.counterpartyName}
                    </span>
                  </div>

                  {/* Sağ Üst: Ürün Miktarı (Sağa Hizalı, Rakamın Tam Üstünde) */}
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ürün Miktarı
                    </span>
                    <span className="font-extrabold text-slate-900 block mt-0.5">
                      {totalQty > 0 ? `${totalQty} adet` : `${r.items?.length || 1} kalem`}
                    </span>
                  </div>

                  {/* Sol Alt: İade Tutarı Etiketi */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      İade Tutarı
                    </span>
                  </div>

                  {/* Sağ Alt: İade Tutarı Rakamı (Sağa Hizalı) */}
                  <div className="pt-2 border-t border-slate-100 text-right">
                    <span className="text-sm font-black text-slate-900 block">
                      {formatMoney(r.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Kart Aksiyonu: Detay Butonu */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedReturn(r)}
                  className="w-full justify-center text-xs font-semibold"
                >
                  İade Detayını İncele
                </Button>
              </div>
            );
          })}
        </div>

        {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="min-w-[800px] w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">SİPARİŞ NO</th>
                  <th className="px-6 py-3.5">{isManufacturer ? 'PERAKENDECİ' : 'ÜRETİCİ'}</th>
                  <th className="px-6 py-3.5">ÜRÜN SAYISI</th>
                  <th className="px-6 py-3.5">İADE TUTARI</th>
                  <th className="px-6 py-3.5">DURUM</th>
                  <th className="px-6 py-3.5">TARİH</th>
                  <th className="px-6 py-3.5 text-right">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {requests.map((r) => {
                  const meta = RETURN_STATUS_META[r.status];
                  const totalQty = r.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.orderNo}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{r.counterpartyName}</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {totalQty > 0 ? `${totalQty} adet` : `${r.items?.length || 1} kalem`}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 tabular-nums text-xs sm:text-sm">
                        {formatMoney(r.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReturn(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Return Request Detail Modal */}
      {selectedReturn && (
        <ReturnDetailModal
          request={selectedReturn}
          myOrgId={myOrgId}
          busyId={busyId}
          onClose={() => setSelectedReturn(null)}
          onDecide={(r, approve) => {
            onDecide(r, approve);
            setSelectedReturn(null);
          }}
        />
      )}
    </>
  );
}
