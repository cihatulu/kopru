import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';
import { CartSummaryCard } from './CartSummaryCard';
import { CheckoutFields } from './CheckoutFields';
import type { useCheckout } from '../api/useCheckout';
import type { CartTotals } from '../domain/cart';

interface Props {
  checkout: ReturnType<typeof useCheckout>;
  totals: CartTotals;
  supplierName: string | null;
  isSubscriber: boolean;
  onSubmit: () => void;
}

/** Sepetin sağ sütunu: özet, müşteri alanları, hata ve gönderim. */
export function CartCheckoutPanel({
  checkout,
  totals,
  supplierName,
  isSubscriber,
  onSubmit,
}: Props) {
  const target = checkout.target;
  // Sipariş verilemiyorsa SEBEBİ görünür; eskiden hata yutuluyordu.
  const message = checkout.error ?? (target.ok ? null : target.error);

  return (
    <div className="flex flex-col gap-4">
      <CartSummaryCard totals={totals} supplierName={supplierName} />

      <CheckoutFields
        values={checkout.customer}
        isSubscriber={isSubscriber}
        allowNoPayment={checkout.allowNoPayment}
        marketingConsent={checkout.marketingConsent}
        onChange={checkout.setCustomerField}
        onAllowNoPaymentChange={checkout.setAllowNoPayment}
        onMarketingConsentChange={checkout.setMarketingConsent}
      />

      {message && (
        <p
          role="alert"
          className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700"
        >
          {message}
        </p>
      )}

      {/* Sepetin tek ve son eylemi — bu yüzden `lg` ve tam genişlik. */}
      <Button
        size="lg"
        className="w-full"
        disabled={!checkout.canSubmit}
        loading={checkout.pending}
        onClick={onSubmit}
      >
        {checkout.pending
          ? 'Gönderiliyor…'
          : `Siparişi Tamamla · ${formatMoney(totals.supplierTotal)}`}
      </Button>
    </div>
  );
}
