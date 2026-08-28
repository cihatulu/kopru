import { TH, THEAD } from '@/components/ui/Table';
import React from 'react';
import { formatMoney } from '@/lib/format';
import { CustomerLedgerDetail } from './CustomerLedgerDetail';
import { customerLedgerKey, type CustomerLedger } from '../domain/customerLedger';
import type { FinanceTransaction, MinimalOrder, MinimalReturnRequest } from '../domain/finance';

const TD = 'px-5 py-3.5 text-sm';

interface Props {
  ledgers: CustomerLedger[];
  orders: MinimalOrder[];
  transactions: FinanceTransaction[];
  returnRequests: MinimalReturnRequest[];
  expandedKeys: string[];
  isEmpty: boolean;
  onToggle: (key: string) => void;
  onShowCustomer: (ledger: CustomerLedger) => void;
}

interface GroupedRootOrder {
  rootNo: string;
  allNos: string[];
  childCount: number;
}

function groupOrderNos(orderList: MinimalOrder[], orderIds: string[]): GroupedRootOrder[] {
  const matchedOrders = orderList.filter((o) => orderIds.includes(o.id));
  const rootMap = new Map<string, string[]>();

  for (const o of matchedOrders) {
    const rootNo = o.orderNo.split('/')[0]?.trim() ?? '';
    if (!rootNo) continue;
    if (!rootMap.has(rootNo)) {
      rootMap.set(rootNo, []);
    }
    rootMap.get(rootNo)!.push(o.orderNo);
  }

  const result: GroupedRootOrder[] = [];
  for (const [rootNo, nos] of rootMap.entries()) {
    const uniqueNos = Array.from(new Set(nos));
    const childOrders = uniqueNos.filter((no) => no.includes('/'));
    result.push({
      rootNo,
      allNos: uniqueNos,
      childCount: childOrders.length,
    });
  }

  return result;
}

/** Müşteri Carileri Tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function CustomerLedgerTable({
  ledgers,
  orders,
  transactions,
  returnRequests,
  expandedKeys,
  isEmpty,
  onToggle,
  onShowCustomer,
}: Props) {
  if (isEmpty || ledgers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Müşteri carisi bulunmuyor.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {ledgers.map((l) => {
          const key = customerLedgerKey(l);
          const isExpanded = expandedKeys.includes(key);
          const groupedRoots = groupOrderNos(orders, l.order_ids);
          const hasDebt = l.remaining_balance > 0;

          return (
            <div
              key={key}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Müşteri Adı, Telefon & Kalan Bakiye Rozeti */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-slate-900 block truncate" title={l.customer_name}>
                    {l.customer_name}
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {l.customer_phone || 'Telefon Yok'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kalan Bakiye
                  </span>
                  <span
                    className={`text-sm font-black font-mono ${
                      hasDebt ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatMoney(l.remaining_balance)}
                  </span>
                </div>
              </div>

              {/* Kart Gövdesi: 2 Sütunlu Finansal Bilgiler */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Üretici
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 truncate" title={l.manufacturer_names.join(', ')}>
                    {l.manufacturer_names.join(', ') || '—'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Siparişler
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1 mt-0.5">
                    {groupedRoots.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      groupedRoots.map((group) => (
                        <span
                          key={group.rootNo}
                          className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          {group.rootNo}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam Sipariş (Borç)
                  </span>
                  <span className="font-extrabold text-red-600 block mt-0.5 font-mono">
                    {formatMoney(l.total_order_amount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam Ödeme (Tahsilat)
                  </span>
                  <span className="font-extrabold text-emerald-700 block mt-0.5 font-mono">
                    {formatMoney(l.total_paid_amount)}
                  </span>
                </div>
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onShowCustomer(l)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                >
                  Müşteri Bilgileri
                </button>

                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  className="px-3 py-1.5 rounded-xl border border-brand-200 bg-brand-50/60 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer shadow-2xs"
                >
                  {isExpanded ? 'Detay Kapat ▲' : 'Detay Aç ▼'}
                </button>
              </div>

              {/* Açılır Hesap Hareketleri Akordeonu */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <CustomerLedgerDetail
                    ledger={l}
                    orders={orders}
                    transactions={transactions}
                    returnRequests={returnRequests}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xs">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className={THEAD}>
            <tr className="border-b border-slate-100">
              <th className={TH}>Müşteri Adı</th>
              <th className={TH}>Müşteri Telefonu</th>
              <th className={TH}>Üretici Adı</th>
              <th className={TH}>Sipariş No</th>
              <th className={`${TH} text-right text-red-600`}>Borç (Sipariş)</th>
              <th className={`${TH} text-right text-emerald-600`}>Alacak (Ödeme)</th>
              <th className={`${TH} text-right`}>Bakiye</th>
              <th className={`${TH} w-[150px] text-right pr-6`}>İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ledgers.map((l) => {
              const key = customerLedgerKey(l);
              const isExpanded = expandedKeys.includes(key);
              const groupedRoots = groupOrderNos(orders, l.order_ids);

              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className={`${TD} font-semibold text-slate-800`}>{l.customer_name}</td>
                    <td className={`${TD} text-slate-500`}>{l.customer_phone || '—'}</td>
                    <td className={`${TD} text-slate-600`}>{l.manufacturer_names.join(', ') || '—'}</td>
                    <td className={TD}>
                      {groupedRoots.length === 0 ? (
                        <span className="text-slate-400 font-normal">—</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {groupedRoots.map((group) => {
                            const tooltipText =
                              group.allNos.length > 1
                                ? `Sipariş ve Sevkiyat Parçaları (${group.allNos.length}):\n• ${group.allNos.join('\n• ')}`
                                : group.rootNo;
                            return (
                              <div
                                key={group.rootNo}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-xs font-bold text-slate-800 cursor-help transition-all hover:bg-slate-200 hover:border-slate-300"
                                title={tooltipText}
                              >
                                <span>{group.rootNo}</span>
                                {group.childCount > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                    +{group.childCount}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className={`${TD} text-right font-semibold text-red-600`}>
                      {l.total_order_amount > 0 ? formatMoney(l.total_order_amount) : '—'}
                    </td>
                    <td className={`${TD} text-right font-semibold text-emerald-600`}>
                      {l.total_paid_amount > 0 ? formatMoney(l.total_paid_amount) : '—'}
                    </td>
                    <td className={`${TD} text-right font-bold text-slate-900`}>
                      {formatMoney(l.remaining_balance)}
                    </td>
                    <td className={`${TD} text-right pr-6`}>
                      <div className="flex justify-end gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => onShowCustomer(l)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Müşteri Bilgileri
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggle(key)}
                          className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                        >
                          {isExpanded ? 'Detay Kapat' : 'Detay Aç'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-5 py-2 bg-slate-50/30">
                        <CustomerLedgerDetail
                          ledger={l}
                          orders={orders}
                          transactions={transactions}
                          returnRequests={returnRequests}
                        />
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
