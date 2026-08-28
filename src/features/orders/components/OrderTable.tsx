import { Button } from '@/components/ui/Button';
import { TD as TD_BASE, TH, THEAD, TH_NUM } from '@/components/ui/Table';
import React, { useState } from 'react';
import { formatDate, formatMoney } from '@/lib/format';
import type { OrderStatus } from '../domain/status';
import type { OrderRow } from '../domain/orderMapping';
import type { OrgKind } from '@/constants';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderStatusCell } from './OrderStatusCell';
import { OrderExpandedDetail } from './OrderExpandedDetail';

interface Props {
  orders: OrderRow[];
  myKind: OrgKind;
  myOrgId: string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  updatingOrderId: string | null;
}

// Satır hücresi ortak dilden; yalnız yatay dolgu bu tabloda daha geniş.
const TD = `${TD_BASE} whitespace-nowrap`;

/** Üreticinin durumu elle değiştirebildiği aşamalar. */
const EDITABLE: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'in_production',
  'partially_shipped',
  'shipped',
];

export function OrderTable({ orders, myKind, myOrgId, onUpdateStatus, updatingOrderId }: Props) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, OrderStatus>>({});

  if (orders.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm italic text-slate-500 shadow-sm">
        Henüz sipariş yok.
      </p>
    );
  }

  const isMfr = myKind === 'manufacturer';

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {orders.map((o) => {
          const isExpanded = expandedOrderId === o.id;

          return (
            <div
              key={o.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Sipariş No & Durum Rozeti */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                      {o.orderNo}
                    </span>
                    {o.status === 'partially_shipped' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        Bakiyesi Var
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 font-medium">{formatDate(o.createdAt)}</p>
                </div>

                <div className="shrink-0">
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>

              {/* Kart Gövdesi: Bilgi Izgarası (Tam Simetrik 2 Sütun) */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 py-3 text-xs">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isMfr ? 'Perakendeci' : 'Tedarikçi'}
                  </span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5" title={o.counterpartyName}>
                    {o.counterpartyName}
                  </span>
                </div>

                {/* Sağ Üst: Son Müşteri (Sağa Hizalı, Tutara Bir Sıra Halinde Hizalı) */}
                <div className="text-right min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Son Müşteri
                  </span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5" title={o.customerName || '—'}>
                    {o.customerName || '—'}
                  </span>
                </div>

                {/* Sol Alt: Toplam Tutar Etiketi */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam Tutar
                  </span>
                </div>

                {/* Sağ Alt: Tutar Değeri (Sağa Hizalı) */}
                <div className="pt-2 border-t border-slate-100 text-right">
                  <span className="text-base font-black text-slate-900 font-mono block">
                    {formatMoney(o.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Üretici Durum Güncelleme Butonları (Mobilde düzenlenebilir durumdaysa) */}
              {isMfr && EDITABLE.includes(o.status) && (
                <div className="pt-2 pb-3 border-t border-slate-100">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Durum Güncelle
                  </span>
                  <OrderStatusCell
                    status={o.status}
                    selected={selectedStatuses[o.id]}
                    pending={updatingOrderId === o.id}
                    isRoot={!o.parentOrderId}
                    onSelect={(s) => setSelectedStatuses((prev) => ({ ...prev, [o.id]: s }))}
                    onUpdate={(s) => onUpdateStatus(o.id, s)}
                    onPartialShip={() => onUpdateStatus(o.id, 'shipped')}
                  />
                </div>
              )}

              {/* Kart Aksiyonları: Teslim Al & Detay */}
              {(() => {
                const canDeliver = !isMfr && (o.status === 'shipped' || o.status === 'partially_shipped');
                return (
                  <div className={`pt-3 border-t border-slate-100 ${canDeliver ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}>
                    {canDeliver && (
                      <Button
                        variant="success"
                        size="sm"
                        disabled={updatingOrderId === o.id}
                        onClick={() => onUpdateStatus(o.id, 'delivered')}
                        className="w-full justify-center text-xs font-bold"
                      >
                        Teslim Aldım
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                      className={`gap-1.5 text-xs font-semibold ${canDeliver ? 'w-full justify-center' : 'ml-auto'}`}
                    >
                      {isExpanded ? 'Detayı Gizle' : 'Detayları Gör'}
                      <svg
                        className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </div>
                );
              })()}

              {/* Genişletilmiş Detay (Açılır Kutu) */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 animate-in fade-in duration-200">
                  <OrderExpandedDetail orderId={o.id} orgId={myOrgId} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Excel Tarzı Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Sipariş No</th>
              <th className={TH}>Tarih</th>
              <th className={TH}>Tutar</th>
              <th className={TH}>{isMfr ? 'Perakendeci' : 'Tedarikçi'}</th>
              <th className={TH}>Son Kullanıcı</th>
              <th className={TH}>Durum</th>
              <th className={`${TH_NUM} pr-8`}>İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const isExpanded = expandedOrderId === o.id;

              return (
                <React.Fragment key={o.id}>
                  <tr className="transition-colors hover:bg-slate-50/40">
                    <td className={`${TD} font-mono font-bold text-slate-900`}>
                      <div className="flex items-center gap-2">
                        <span>{o.orderNo}</span>
                        {o.status === 'partially_shipped' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                            Bakiyesi Var
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${TD} text-slate-500`}>{formatDate(o.createdAt)}</td>
                    <td className={`${TD} font-extrabold text-slate-900`}>{formatMoney(o.totalAmount)}</td>
                    <td className={`${TD} font-medium text-slate-700`}>{o.counterpartyName}</td>
                    <td className={`${TD} font-medium text-slate-700`}>{o.customerName || '—'}</td>
                    <td className={TD}>
                      {isMfr && EDITABLE.includes(o.status) ? (
                        <OrderStatusCell
                          status={o.status}
                          selected={selectedStatuses[o.id]}
                          pending={updatingOrderId === o.id}
                          isRoot={!o.parentOrderId}
                          onSelect={(s) => setSelectedStatuses((prev) => ({ ...prev, [o.id]: s }))}
                          onUpdate={(s) => onUpdateStatus(o.id, s)}
                          onPartialShip={() => onUpdateStatus(o.id, 'shipped')}
                        />
                      ) : (
                        <OrderStatusBadge status={o.status} />
                      )}
                    </td>
                    <td className={`${TD} text-right pr-8`}>
                      <div className="flex justify-end gap-2 items-center">
                        {!isMfr && (o.status === 'shipped' || o.status === 'partially_shipped') && (
                          <Button
                            variant="success"
                            size="sm"
                            disabled={updatingOrderId === o.id}
                            onClick={() => onUpdateStatus(o.id, 'delivered')}
                          >
                            Teslim Aldım
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        >
                          Detay
                          <svg
                            className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={7} className="px-6 py-6 border-t border-slate-100">
                        <OrderExpandedDetail orderId={o.id} orgId={myOrgId} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
