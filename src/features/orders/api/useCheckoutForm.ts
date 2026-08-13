import { useState } from 'react';
import { EMPTY_CUSTOMER, type CustomerFields } from '../domain/checkout';

export type PaymentMethod = 'cash' | 'pos_own' | 'pos_manufacturer';

/**
 * Sepet formunun alanları.
 *
 * Gönderim mantığından ayrı tutulur: `useCheckout` yalnız siparişi verir,
 * form durumu burada yaşar.
 */
export function useCheckoutForm() {
  const [customer, setCustomer] = useState<CustomerFields>(EMPTY_CUSTOMER);
  const [allowNoPayment, setAllowNoPayment] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [salespersonUserId, setSalespersonUserId] = useState('');

  return {
    customer,
    setCustomerField: (key: keyof CustomerFields, value: string) =>
      setCustomer((prev) => ({ ...prev, [key]: value })),
    allowNoPayment,
    setAllowNoPayment,
    marketingConsent,
    setMarketingConsent,
    paymentMethod,
    setPaymentMethod,
    paymentAmount,
    setPaymentAmount,
    salespersonUserId,
    setSalespersonUserId,
  };
}

export type CheckoutForm = ReturnType<typeof useCheckoutForm>;
