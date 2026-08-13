import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/lib/format';
import {
  CartLinesTable,
  CartNotice,
  CartSummaryCard,
  CheckoutFields,
  DownPaymentPanel,
  useCart,
  useCheckout,
  type CartSupplier,
} from '@/features/orders';
import { SalespersonSelect, type SalespersonOption } from '@/features/orders';
import { useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { useStaff } from '@/features/team';
import { ROUTES } from '@/constants';

/** Perakendecinin sepeti — YALNIZ KOMPOZİSYON (A20). */
export default function CartPage() {
  const { data: user } = useAuthSession();
  const { lines, totals, setCartQuantity, clearCart } = useCart();
  const counterparties = useCounterparties();
  const navigate = useNavigate();

  const suppliers: CartSupplier[] = (counterparties.data?.pages.flat() ?? [])
    .filter((e) => e.status === 'active')
    .map((e) => ({
      id: e.id,
      manufacturerOrgId: e.manufacturerOrgId,
      companyName: e.manufacturer.companyName,
    }));

  const isSubscriber = user?.org?.isSubscriber ?? false;
  const checkout = useCheckout(lines, suppliers, isSubscriber);

  // Satışçı adayları: kendi ekibinin AKTİF üyeleri. Sunucu da bunu doğruluyor.
  const staff = useStaff();
  const salespeople: SalespersonOption[] = (staff.data ?? [])
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, label: s.fullName?.trim() || s.userCode }));

  if (!user?.org) return null;

  if (checkout.placed) {
    return (
      <CartNotice
        tone="success"
        title="Siparişiniz Alındı!"
        description="Siparişlerim sekmesinden takip edebilirsiniz."
        actionLabel="Siparişlerime Git"
        onAction={() => void navigate(`${ROUTES.retailer}/siparisler`)}
      />
    );
  }

  if (lines.length === 0) {
    return (
      <CartNotice
        tone="empty"
        title="Sepetiniz boş"
        description="Ürün kataloğundan ürün ekleyebilirsiniz."
        actionLabel="Kataloga Git"
        onAction={() => void navigate(`${ROUTES.retailer}/katalog`)}
      />
    );
  }

  const target = checkout.target;
  const supplier = target.ok ? target.supplier : null;
  const totalQty = lines.reduce((acc, l) => acc + l.quantity, 0);

  return (
    <div className="font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alışveriş Sepeti</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lines.length} ürün · {totalQty} adet
          </p>
        </div>
        <SalespersonSelect
          options={salespeople}
          value={checkout.salespersonUserId}
          onChange={checkout.setSalespersonUserId}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 self-start flex flex-col gap-6">
          <CartLinesTable
            lines={lines}
            onQuantityChange={(l, quantity) =>
              setCartQuantity(l.productId, quantity, l.customDescription, l.priceDifference)
            }
          />

          {isSubscriber && (
            <DownPaymentPanel
              disabled={checkout.allowNoPayment}
              method={checkout.paymentMethod}
              amount={checkout.paymentAmount}
              onMethodChange={checkout.setPaymentMethod}
              onAmountChange={checkout.setPaymentAmount}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <CartSummaryCard totals={totals} supplierName={supplier?.companyName ?? null} />

          <CheckoutFields
            values={checkout.customer}
            isSubscriber={isSubscriber}
            allowNoPayment={checkout.allowNoPayment}
            marketingConsent={checkout.marketingConsent}
            onChange={checkout.setCustomerField}
            onAllowNoPaymentChange={checkout.setAllowNoPayment}
            onMarketingConsentChange={checkout.setMarketingConsent}
          />

          {/* Sipariş verilemiyorsa SEBEBİ görünür; eskiden hata yutuluyordu. */}
          {(checkout.error ?? (!target.ok ? target.error : null)) && (
            <p role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
              {checkout.error ?? (target.ok ? '' : target.error)}
            </p>
          )}

          <button
            type="button"
            disabled={!checkout.canSubmit}
            onClick={() => checkout.submit(clearCart)}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {checkout.pending
              ? 'Gönderiliyor...'
              : `Siparişi Tamamla · ${formatMoney(totals.supplierTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
