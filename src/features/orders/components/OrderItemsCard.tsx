import React from 'react';
import { formatMoney } from '@/lib/format';
import type { OrderItemRow } from '../domain/orderMapping';

const CARD = 'rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04]';
const CAPTION = 'text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5';

/** İşaretli tutar: eksi fark indirimdir ve öyle okunmalıdır. */
const signed = (n: number) => `${n > 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

/** Sipariş detayının kalem tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function OrderItemsCard({
  items,
  totalAmount,
  returnTotalAmount = 0,
  isCancelled = false,
}: {
  items: OrderItemRow[];
  totalAmount: number;
  returnTotalAmount?: number;
  isCancelled?: boolean;
}) {
  const netTotal = totalAmount - returnTotalAmount;
  const hasReturns = items.some((i) => i.returnedQty > 0);

  return (
    <div className={`${CARD} space-y-3`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className={CAPTION}>
          <span className="text-slate-400">•</span> SİPARİŞ EDİLEN ÜRÜNLER
        </h4>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {items.length} Kalem
        </span>
      </div>

      {/* 📱 MOBİL GÖRÜNÜM: Kaydırma Çubuğu Olmayan Ferah Kalem Kartları (md altı ekranlar) */}
      <div className="space-y-2.5 md:hidden">
        {items.map((i) => {
          const unitTotal = i.supplierUnitPrice + i.priceDifference;
          return (
            <div
              key={i.id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs space-y-2"
            >
              {/* Üst Sıra: Durum + Ürün Adı + Miktar */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                        ✕ İPTAL
                      </span>
                    )}
                    <span className="font-bold text-slate-900 leading-snug">
                      {i.name}
                    </span>
                  </div>
                  {i.customDescription && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-snug text-amber-900 ring-1 ring-inset ring-amber-200">
                      Talep: {i.customDescription}
                    </p>
                  )}
                </div>

                <span className="shrink-0 font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs font-mono">
                  {i.quantity} Adet
                </span>
              </div>

              {/* Alt Sıra: Birim Fiyat & Satır Toplamı (Tam Simetrik) */}
              <div className="flex items-end justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Birim Fiyat:</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {formatMoney(i.supplierUnitPrice)}
                  </span>
                  {i.priceDifference !== 0 && (
                    <span className={`ml-1 font-bold ${i.priceDifference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      ({i.priceDifference > 0 ? '+' : ''}{formatMoney(i.priceDifference)})
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block font-medium">Toplam:</span>
                  {isCancelled ? (
                    <span className="font-bold text-red-400 line-through font-mono text-xs">
                      {formatMoney(unitTotal * i.quantity)}
                    </span>
                  ) : (
                    <span className="font-black text-slate-900 font-mono text-xs">
                      {formatMoney(unitTotal * i.quantity)}
                    </span>
                  )}
                </div>
              </div>

              {/* Varsa İade Bilgisi */}
              {!isCancelled && i.returnedQty > 0 && (
                <div className="mt-2 pt-2 border-t border-red-100 bg-red-50/70 p-2 rounded-lg flex items-center justify-between text-[11px]">
                  <span className="font-bold text-red-700">
                    ↩ İade: −{i.returnedQty} Adet
                  </span>
                  <span className="font-black text-red-700 font-mono">
                    −{formatMoney(unitTotal * i.returnedQty)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              {isCancelled && <th className="pb-2 pr-2">Durum</th>}
              <th className="pb-2">Ürün Adı</th>
              <th className="pb-2 text-center">Miktar</th>
              <th className="pb-2 text-right">Birim Fiyat</th>
              <th className="pb-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => {
              const unitTotal = i.supplierUnitPrice + i.priceDifference;
              return (
                <React.Fragment key={i.id}>
                  <tr className="text-slate-700 align-top">
                    {isCancelled && (
                      <td className="py-3 pr-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                          ✕ İPTAL
                        </span>
                      </td>
                    )}
                    <td className="py-3 pr-2">
                      <p className="font-bold text-slate-800">{i.name}</p>
                      {i.customDescription && (
                        <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-snug text-amber-900 ring-1 ring-inset ring-amber-200">
                          Talep: {i.customDescription}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                      {i.quantity} Adet
                    </td>
                    <td className="py-3 text-right text-slate-500 whitespace-nowrap">
                      <p>{formatMoney(i.supplierUnitPrice)}</p>
                      {i.priceDifference !== 0 && (
                        <p className={`text-[11px] font-bold ${i.priceDifference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ({i.priceDifference > 0 ? '+' : ''}{formatMoney(i.priceDifference)})
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {isCancelled ? (
                        <>
                          <p className="font-bold text-red-400 line-through">
                            {formatMoney(unitTotal * i.quantity)}
                          </p>
                          {i.priceDifference !== 0 && (
                            <p className="text-[10px] text-red-300 line-through">
                              (Taban: {formatMoney(i.supplierUnitPrice * i.quantity)} {signed(i.priceDifference * i.quantity)})
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-slate-900">
                            {formatMoney(i.supplierUnitPrice * i.quantity)}
                          </p>
                          {i.priceDifference !== 0 && (
                            <React.Fragment key="diff">
                              <p
                                className={`mt-1 font-semibold ${
                                  i.priceDifference > 0 ? 'text-amber-700' : 'text-emerald-700'
                                }`}
                              >
                                {signed(i.priceDifference * i.quantity)}
                              </p>
                              <p className="mt-1 border-t border-slate-200 pt-1 font-bold text-slate-900">
                                {formatMoney(unitTotal * i.quantity)}
                              </p>
                            </React.Fragment>
                          )}
                        </>
                      )}
                    </td>
                  </tr>

                  {!isCancelled && i.returnedQty > 0 && (
                    <tr key={`${i.id}-return`} className="bg-red-50/60 align-top">
                      <td className="py-2 pr-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                          ↩ İADE
                        </span>
                        <span className="ml-2 text-[10px] text-red-600 font-medium">{i.name}</span>
                      </td>
                      <td className="py-2 text-center font-bold text-red-700 whitespace-nowrap">
                        −{i.returnedQty} Adet
                      </td>
                      <td className="py-2 text-right text-slate-400 whitespace-nowrap">
                        {formatMoney(i.supplierUnitPrice)}
                      </td>
                      <td className="py-2 text-right font-bold text-red-700 whitespace-nowrap">
                        −{formatMoney(unitTotal * i.returnedQty)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Alt Toplam Özeti */}
      <div className="border-t border-slate-100 pt-3 space-y-1">
        {isCancelled ? (
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Toplam Tutar:</span>
            <span className="font-extrabold text-red-600 text-sm font-mono">{formatMoney(0)}</span>
          </div>
        ) : (
          <>
            {hasReturns && (
              <>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-medium">Sipariş Tutarı:</span>
                  <span className="font-semibold line-through font-mono">{formatMoney(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-red-600">
                  <span className="font-medium">İade Tutarı:</span>
                  <span className="font-semibold font-mono">−{formatMoney(returnTotalAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Toplam Tutar:</span>
              <span className="font-black text-slate-900 text-sm font-mono">{formatMoney(netTotal)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
