import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/lib/format';
import { useCart, usePlaceOrder, lineTotal } from '@/features/orders';
import { useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { useAddFinanceTransaction } from '@/features/finance';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

const placeholder =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNjAwIDQwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=";

export default function CartPage() {
  const { data: user } = useAuthSession();
  const { lines, totals, setCartQuantity, clearCart } = useCart();
  const suppliers = useCounterparties();
  const place = usePlaceOrder();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerProvince, setCustomerProvince] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [allowNoPayment, setAllowNoPayment] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_own' | 'pos_manufacturer'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [placed, setPlaced] = useState(false);

  const addTx = useAddFinanceTransaction();

  const edges = (suppliers.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  const selected = edges[0]; // aktif tedarikçi

  const discountRate = selected?.discountRate ?? 0;
  const subtotal = totals.supplierTotal;
  const discountAmount = Math.round((subtotal * discountRate) / 100 * 100) / 100;
  const grandTotal = subtotal - discountAmount;

  const totalQty = lines.reduce((acc, l) => acc + l.quantity, 0);

  if (!user?.org) return null;

  if (lines.length === 0 && !placed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="size-10 text-slate-300">
            <path d="M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-600">Sepetiniz boş</p>
          <p className="text-sm text-slate-400 mt-1">Ürün kataloğundan ürün ekleyebilirsiniz.</p>
        </div>
        <Button onClick={() => navigate(`${ROUTES.retailer}/katalog`)} className="mt-2">
          Kataloga Git
        </Button>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-10 text-emerald-500">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-700">Siparişiniz Alındı!</p>
          <p className="text-sm text-slate-400 mt-1">Siparişlerim sekmesinden takip edebilirsiniz.</p>
        </div>
        <Button onClick={() => navigate(`${ROUTES.retailer}/siparisler`)} className="mt-2">
          Siparişlerime Git
        </Button>
      </div>
    );
  }

  const isSubscriber = user.org.isSubscriber;

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alışveriş Sepeti</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lines.length} ürün · {totalQty} adet
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Cart Table & Down Payment */}
        <div className="lg:col-span-2 self-start flex flex-col gap-6">
          {/* Cart Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sepet İçeriği</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[500px] w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ürün</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Birim Fiyat</th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">Adet</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Toplam</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((l) => {
                    const effectiveUnit = l.unitPrice + (l.priceDifference || 0);
                    const itemKey = `${l.productId}_${l.customDescription || ''}_${l.priceDifference || 0}`;
                    return (
                      <tr key={itemKey} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                              <img
                                src={l.imageUrl || placeholder}
                                alt={l.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-sm line-clamp-2 leading-tight">{l.name}</p>
                              {l.model && l.model !== l.code && (
                                <p className="text-xs text-slate-400 mt-0.5">{l.model}</p>
                              )}
                              <p className="text-xs text-slate-400 font-mono">{l.code}</p>
                              {l.customDescription && (
                                <span className="mt-1.5 inline-block text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-semibold border border-indigo-100/50">
                                  Değişiklik: {l.customDescription}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          <div>{formatMoney(effectiveUnit)}</div>
                          {l.priceDifference != null && l.priceDifference !== 0 && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              Taban: {formatMoney(l.unitPrice)}&nbsp;
                              {l.priceDifference > 0 ? '+' : ''}{formatMoney(l.priceDifference)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCartQuantity(l.productId, l.quantity - 1, l.customDescription, l.priceDifference)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-all text-base font-medium leading-none"
                            >
                              −
                            </button>
                            <span className="w-9 text-center text-sm font-bold text-slate-800">{l.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setCartQuantity(l.productId, l.quantity + 1, l.customDescription, l.priceDifference)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-all text-base font-medium leading-none"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-bold text-slate-800 whitespace-nowrap">
                          {formatMoney(lineTotal(l))}
                        </td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => setCartQuantity(l.productId, 0, l.customDescription, l.priceDifference)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all ml-auto"
                            title="Sepetten çıkar"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peşinat / İlk Tahsilat Girişi (Yalnızca ÜYE perakendecilerde görünür) */}
          {isSubscriber && (
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-200 ${
              allowNoPayment 
                ? 'opacity-50 grayscale pointer-events-none border-slate-100 bg-slate-50/50' 
                : 'border-indigo-100 bg-indigo-50/10'
            }`}>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-150 bg-slate-50/40">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  PEŞİNAT / İLK TAHSİLAT GİRİŞİ
                </span>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    ÖDEME YÖNTEMİ
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                  >
                    <option value="cash">Nakit (Kasa Hesabına Geçer)</option>
                    <option value="pos_own">Kredi Kartı - Bizim POS (Banka Hesabına)</option>
                    <option value="pos_manufacturer">Kredi Kartı - Üretici POS (Üretici Carisinden Düşer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    TAHSİL EDİLEN TUTAR (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Örn: 5000"
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    required={!allowNoPayment}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sipariş Özeti</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Ara Toplam</span>
                <span className="font-semibold text-slate-700">{formatMoney(subtotal)}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
                    </svg>
                    İndirim (%{discountRate})
                  </span>
                  <span className="font-semibold text-emerald-600">−{formatMoney(discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">Genel Toplam</span>
                  <span className="text-xl font-bold text-slate-900">{formatMoney(grandTotal)}</span>
                </div>
                {discountRate > 0 && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <p className="text-xs text-emerald-700 font-medium text-center">
                      🎉 %{discountRate} özel indiriminiz uygulandı — {formatMoney(discountAmount)} tasarruf
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-purple-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sipariş Bilgileri</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="cart-customer-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Müşteri Adı <span className="text-slate-300 font-normal">(Opsiyonel)</span>
                </label>
                <input
                  id="cart-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Örn. Ahmet Yılmaz"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>

              {isSubscriber && (
                <>
                  <div>
                    <label htmlFor="cart-customer-phone" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      Müşteri Cep Telefonu <span className="text-slate-300 font-normal">(Opsiyonel)</span>
                    </label>
                    <input
                      id="cart-customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0xxxxxxxxx"
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Numara girilirse, sipariş sonrası müşteriye WhatsApp ile takip linki gönderilir.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="cart-customer-email" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      MÜŞTERİ E-POSTA <span className="text-slate-300 font-normal">(OPSİYONEL)</span>
                    </label>
                    <input
                      id="cart-customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Örn: ahmet@example.com"
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="cart-customer-province" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      İL <span className="text-slate-300 font-normal">(OPSİYONEL)</span>
                    </label>
                    <input
                      id="cart-customer-province"
                      type="text"
                      value={customerProvince}
                      onChange={(e) => setCustomerProvince(e.target.value)}
                      placeholder="Örn: İstanbul"
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="cart-customer-district" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      İLÇE <span className="text-slate-300 font-normal">(OPSİYONEL)</span>
                    </label>
                    <input
                      id="cart-customer-district"
                      type="text"
                      value={customerDistrict}
                      onChange={(e) => setCustomerDistrict(e.target.value)}
                      placeholder="Örn: Kadıköy"
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="cart-customer-address" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      AÇIK ADRES <span className="text-slate-300 font-normal">(OPSİYONEL)</span>
                    </label>
                    <textarea
                      id="cart-customer-address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Mahalle, sokak, bina no..."
                      rows={2}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="cart-order-note" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                  SİPARİŞ AÇIKLAMASI / NOTU <span className="text-slate-300 font-normal">(OPSİYONEL)</span>
                </label>
                <textarea
                  id="cart-order-note"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Sevkiyat detayları, teslimat notları..."
                  rows={2}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Checkboxes (Yalnızca ÜYE perakendecilerde görünür) */}
              {isSubscriber && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowNoPayment}
                      onChange={(e) => setAllowNoPayment(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4"
                    />
                    Şu an tahsilat almadan siparişi tamamlamak istiyorum.
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4"
                    />
                    Kampanya e-postalarını almak istiyorum.
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            disabled={
              place.isPending ||
              addTx.isPending ||
              !selected ||
              (isSubscriber && !allowNoPayment && (!paymentAmount || Number(paymentAmount) <= 0))
            }
            onClick={() => {
              if (!selected) return;
              place.mutate(
                {
                  relationshipId: selected.id,
                  lines,
                  customer: {
                    name: customerName || undefined,
                    phone: isSubscriber ? customerPhone || undefined : undefined,
                    email: isSubscriber ? customerEmail || undefined : undefined,
                    province: isSubscriber ? customerProvince || undefined : undefined,
                    district: isSubscriber ? customerDistrict || undefined : undefined,
                    address: isSubscriber ? customerAddress || undefined : undefined,
                    note: orderNote || undefined,
                  },
                },
                {
                  onSuccess: (orderId) => {
                    if (isSubscriber && !allowNoPayment && Number(paymentAmount) > 0) {
                      addTx.mutate({
                        type: 'income',
                        method: paymentMethod,
                        amount: Number(paymentAmount),
                        description: 'Sipariş anında peşinat tahsilatı',
                        order_id: orderId,
                        manufacturer_id: selected.manufacturerOrgId,
                      }, {
                        onSuccess: () => {
                          clearCart();
                          setPlaced(true);
                        },
                      });
                    } else {
                      clearCart();
                      setPlaced(true);
                    }
                  },
                },
              );
            }}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {place.isPending || addTx.isPending ? (
              <>
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                İşleniyor...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Siparişi Tamamla · {formatMoney(grandTotal)}
              </>
            )}
          </button>

          {place.isError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
              Sipariş verilemedi. Lütfen tekrar deneyin.
            </p>
          )}

          {addTx.isError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
              Sipariş oluşturuldu fakat tahsilat eklenirken hata oluştu: {(addTx.error as Error).message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
