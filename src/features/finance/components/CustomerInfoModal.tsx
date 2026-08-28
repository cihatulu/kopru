import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { CustomerLedger } from '../domain/customerLedger';

interface Props {
  customer: CustomerLedger;
  onClose: () => void;
}

/** Müşterinin iletişim bilgileri ve sipariş takip bağlantıları. */
export function CustomerInfoModal({ customer, onClose }: Props) {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyLink = async (orderId: string, orderToken: string) => {
    const url = `${window.location.origin}/takip/${orderToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOrderId(orderId);
      setTimeout(() => {
        setCopiedOrderId((prev) => (prev === orderId ? null : prev));
      }, 2000);
    } catch {
      // fallback
    }
  };

  const orders = customer.orders_info ?? [];

  return (
    <Modal
      label="Müşteri Bilgileri"
      panelClassName="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold text-base">
            {customer.customer_name.trim().charAt(0).toUpperCase() || 'M'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{customer.customer_name}</h3>
            <p className="text-xs text-slate-500">Müşteri Detay ve İletişim Kartı</p>
          </div>
        </div>

        {/* İletişim ve Adres Alanları */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 space-y-3.5 text-xs text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Telefon</span>
              <span className="font-semibold text-slate-800 text-sm">
                {customer.customer_phone || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">E-posta</span>
              <span className="font-medium text-slate-800">
                {customer.customer_email || 'Belirtilmemiş'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">İl</span>
              <span className="font-medium text-slate-800">
                {customer.customer_province || 'Belirtilmemiş'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">İlçe</span>
              <span className="font-medium text-slate-800">
                {customer.customer_district || 'Belirtilmemiş'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Açık Adres</span>
            <span className="text-slate-800 leading-relaxed block">
              {customer.customer_address || 'Belirtilmemiş'}
            </span>
          </div>
        </div>

        {/* Müşterinin Siparişleri ve Takip Linkleri */}
        {orders.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Müşterinin Siparişleri ({orders.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {orders.map((order) => {
                const isCopied = copiedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {order.orderNo}
                      </span>
                      {order.manufacturerName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {order.manufacturerName}
                        </span>
                      )}
                    </div>

                    {order.orderToken ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyLink(order.id, order.orderToken!)}
                        className={`gap-1.5 text-xs font-semibold ${
                          isCopied
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Takip Linkini Kopyala</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Takip linki yok</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
