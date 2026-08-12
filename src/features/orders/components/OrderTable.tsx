import React, { useState } from 'react';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { ORDER_STATUS_META, getAvailableTransitions, type OrderStatus } from '../domain/status';
import { useOrderDetail, type OrderRow } from '../api/useOrders';
import type { OrgKind } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  orders: OrderRow[];
  myKind: OrgKind;
  myOrgId: string;
  onSelect: (order: OrderRow) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  updatingOrderId: string | null;
}

const TH = 'px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50';
const TD = 'px-6 py-4.5 align-middle whitespace-nowrap text-sm';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

/**
 * Inline genişleyen sipariş detayı alt satırı.
 * React-Query sayesinden her açıldığında veritabanından taze bilgiyi lazy-load çeker.
 */
function ExpandedOrderRow({ orderId, orgId }: { orderId: string; orgId: string }) {
  const { data: detail, isPending, isError } = useOrderDetail(orderId, orgId);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-6 pl-2">
        <Spinner />
        <span className="font-medium">Sipariş detayları yükleniyor...</span>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <p role="alert" className="text-xs font-bold text-red-600 py-6 pl-2">
        Sipariş detayları yüklenemedi.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
      {/* Sol Sütun: Müşteri & Alıcı Bilgileri ve Bu Siparişten Yapılan Sevkiyatlar */}
      <div className="space-y-6">
        {/* Sol Kart 1: MÜŞTERİ & ALICI BİLGİLERİ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <span className="text-slate-400">•</span> MÜŞTERİ & ALICI BİLGİLERİ
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Son Kullanıcı (Müşteri)</p>
                <p className="font-bold text-slate-800">{detail.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Müşteri Telefon</p>
                <p className="font-mono text-slate-700">{detail.customerPhone || '—'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span className="text-slate-400">•</span> TESLİMAT ADRESİ
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium flex items-center gap-1.5">
              <span className="text-slate-400">🏢</span> {detail.customerAddress || '—'}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span className="text-slate-400">•</span> SİPARİŞ AÇIKLAMASI
            </h4>
            <div className="rounded-xl bg-amber-50/50 border border-amber-200/60 p-3.5 text-xs text-amber-900 font-medium italic">
              {detail.note || '—'}
            </div>
          </div>
        </div>

        {/* Sol Kart 2: BU SİPARİŞTEN YAPILAN SEVKİYATLAR */}
        {detail.shipments && detail.shipments.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="text-slate-400">•</span> BU SİPARİŞTEN YAPILAN SEVKİYATLAR
            </h4>
            <div className="space-y-2.5">
              {detail.shipments.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-xs text-slate-800">{s.shipmentNo}</p>
                    <p className="font-mono text-[10px] text-slate-400">{formatDateTime(s.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-xs text-slate-900">{formatMoney(s.totalAmount)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      Sevk Edildi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sağ Sütun: Sipariş Edilen Ürünler (Kart 1) ve Sipariş Tarihçesi (Kart 2) */}
      <div className="space-y-6">
        {/* Sağ Üst Kart: SİPARİŞ EDİLEN ÜRÜNLER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-slate-400">•</span> SİPARİŞ EDİLEN ÜRÜNLER
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {detail.items.length} Kalem
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2">Ürün Adı</th>
                  <th className="pb-2 text-center">Miktar</th>
                  <th className="pb-2 text-right">Birim Fiyat</th>
                  <th className="pb-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id} className="text-slate-700">
                    <td className="py-3 pr-2">
                      <p className="font-bold text-slate-800">{i.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{i.code}</p>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                      {i.quantity} Adet
                    </td>
                    <td className="py-3 text-right text-slate-500 whitespace-nowrap">
                      {formatMoney(i.supplierUnitPrice)}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(i.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
            <span className="font-bold text-slate-700">Toplam Tutar:</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {formatMoney(detail.totalAmount)}
            </span>
          </div>
        </div>

        {/* Sağ Alt Kart: SİPARİŞ TARİHÇESİ (TİMELİNE) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <span className="text-slate-400">•</span> SİPARİŞ TARİHÇESİ (TİMELİNE)
          </h4>

          {detail.history.length === 0 ? (
            <p className="text-xs italic text-slate-400 py-2">Tarihçe kaydı bulunmuyor.</p>
          ) : (
            <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {detail.history.map((h, idx) => (
                <div key={h.id || idx} className="relative text-xs">
                  <div className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white ring-1 ring-slate-400" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-500 font-medium">
                      {formatDateTime(h.createdAt)}
                    </span>
                    <OrderStatusBadge status={h.toStatus} />
                    {h.shipmentBadge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {h.shipmentBadge}
                      </span>
                    )}
                  </div>
                  {h.note && (
                    <p className="mt-1 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed font-normal">
                      {h.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderTable({ orders, myKind, myOrgId, onSelect, onUpdateStatus, updatingOrderId }: Props) {
  // Genişletilmiş satırın ID'si
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Her satırdaki durum seçimini tutan yerel state
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, OrderStatus>>({});

  if (orders.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm italic text-slate-500 shadow-sm">
        Henüz sipariş yok.
      </p>
    );
  }

  const isMfr = myKind === 'manufacturer';

  const toggleDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className={TH}>Sipariş No</th>
            <th className={TH}>Tarih</th>
            <th className={TH}>Tutar</th>
            <th className={TH}>{isMfr ? 'Perakendeci' : 'Tedarikçi'}</th>
            <th className={TH}>Son Kullanıcı</th>
            <th className={TH}>Durum</th>
            <th className={`${TH} text-right pr-8`}>İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => {
            const allowed = getAvailableTransitions(o.status, myKind);
            const currentSelected = selectedStatuses[o.id] ?? (o.status === 'confirmed' ? 'pending' : o.status);
            const isPending = updatingOrderId === o.id;

            const isExpanded = expandedOrderId === o.id;
            const isEditable = isMfr && (o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_production' || o.status === 'partially_shipped' || o.status === 'shipped');

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
                  {isEditable ? (
                    <div className="flex flex-col gap-1.5 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentSelected}
                          onChange={(e) => {
                            setSelectedStatuses((prev) => ({ ...prev, [o.id]: e.target.value as OrderStatus }));
                          }}
                          className="text-xs border border-slate-200 rounded-xl py-1.5 pl-3 pr-8 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-sm"
                        >
                          {(o.status === 'pending' || o.status === 'confirmed') && (
                            <>
                              <option value="pending">Bekliyor</option>
                              <option value="in_production">Üretiliyor</option>
                              <option value="cancelled">İptal Edildi</option>
                            </>
                          )}
                          {(o.status === 'in_production' || o.status === 'partially_shipped') && (
                            <>
                              <option value="pending" disabled>Bekliyor</option>
                              <option value="in_production">Üretiliyor</option>
                              <option value="shipped">Sevkiyatta</option>
                              <option value="cancelled">İptal Edildi</option>
                            </>
                          )}
                          {o.status === 'shipped' && (
                            <>
                              <option value="shipped">Sevkiyatta</option>
                              <option value="cancelled">İptal Edildi</option>
                            </>
                          )}
                        </select>
                        <button
                          type="button"
                          disabled={
                            isPending ||
                            selectedStatuses[o.id] === undefined ||
                            selectedStatuses[o.id] === (o.status === 'confirmed' ? 'pending' : o.status)
                          }
                          onClick={() => onUpdateStatus(o.id, selectedStatuses[o.id])}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                            selectedStatuses[o.id] !== undefined &&
                            selectedStatuses[o.id] !== (o.status === 'confirmed' ? 'pending' : o.status)
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-sm cursor-pointer'
                              : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          Güncelle
                        </button>
                      </div>
                      {(o.status === 'in_production' || o.status === 'partially_shipped') && !o.parentOrderId && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(o.id, 'shipped')}
                          className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors shadow-sm w-full uppercase tracking-wider cursor-pointer font-sans"
                        >
                          Kısmi Sevk Et
                        </button>
                      )}
                    </div>
                  ) : (
                    <OrderStatusBadge status={o.status} />
                  )}
                </td>
                <td className={`${TD} text-right pr-8`}>
                  <div className="flex justify-end gap-2 items-center">
                    {/* Perakendeci Aksiyonları */}
                    {!isMfr && (o.status === 'shipped' || o.status === 'partially_shipped') && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onUpdateStatus(o.id, 'delivered')}
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition-all hover:bg-emerald-700 shadow-sm cursor-pointer"
                      >
                        Teslim Aldım
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleDetails(o.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors border cursor-pointer ${
                        isExpanded
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>Detay</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${o.id}-detail`} className="bg-slate-50/30">
                  <td colSpan={7} className="px-6 py-6 border-t border-slate-100">
                    <ExpandedOrderRow orderId={o.id} orgId={myOrgId} />
                  </td>
                </tr>
              )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
