import { useState } from 'react';
import { useAddFinanceTransaction } from '@/features/finance';
import { errorMessage } from '@/lib/errorMessage';
import {
  EMPTY_CUSTOMER,
  resolveCartTarget,
  toOrderCustomer,
  type CartSupplier,
  type CustomerFields,
} from '../domain/checkout';
import { usePlaceOrder } from './useOrderMutations';
import type { CartLine } from '../domain/cart';

export type PaymentMethod = 'cash' | 'pos_own' | 'pos_manufacturer';

/**
 * Sepetten sipariş verme akışı.
 *
 * Hedef ilişki SEPET SATIRLARINDAN türetilir (bkz. `resolveCartTarget`).
 * Satışçı zorunludur — raporlarda personel kırılımı buna dayanır ve sunucu da
 * satışçısız siparişi reddeder.
 *
 * Hata YUTULMAZ: sunucudan gelen mesaj `error` ile ekrana çıkar.
 */
export function useCheckout(lines: CartLine[], suppliers: CartSupplier[], isSubscriber: boolean) {
  const place = usePlaceOrder();
  const addTx = useAddFinanceTransaction();

  const [customer, setCustomer] = useState<CustomerFields>(EMPTY_CUSTOMER);
  const [allowNoPayment, setAllowNoPayment] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [salespersonUserId, setSalespersonUserId] = useState('');
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = resolveCartTarget(lines, suppliers);
  const downPayment = Number(paymentAmount);
  const needsPayment = isSubscriber && !allowNoPayment;
  const canSubmit =
    target.ok &&
    salespersonUserId !== '' &&
    !place.isPending &&
    !addTx.isPending &&
    (!needsPayment || downPayment > 0);

  const submit = (onDone: () => void) => {
    if (!target.ok) {
      setError(target.error);
      return;
    }
    // Sunucu da reddeder; buradaki kontrol anlamlı mesaj vermek için.
    if (!salespersonUserId) {
      setError('Lütfen satışı yapan personeli seçin.');
      return;
    }
    setError(null);

    place.mutate(
      {
        relationshipId: target.relationshipId,
        lines,
        salespersonUserId,
        customer: toOrderCustomer(customer, isSubscriber),
      },
      {
        onError: (err) => setError(errorMessage(err, 'Sipariş oluşturulamadı.')),
        onSuccess: (orderId) => {
          if (!needsPayment || downPayment <= 0) {
            setPlaced(true);
            onDone();
            return;
          }
          // Peşinat siparişle aynı anda alınır ama ayrı bir defter kaydıdır.
          addTx.mutate(
            {
              type: 'income',
              method: paymentMethod,
              amount: downPayment,
              description: 'Sipariş anında peşinat tahsilatı',
              order_id: orderId,
              manufacturer_id: target.supplier.manufacturerOrgId,
            },
            {
              onError: (err) =>
                setError(
                  `Sipariş oluşturuldu ancak peşinat kaydedilemedi: ${errorMessage(err, 'bilinmeyen hata')}`,
                ),
              onSuccess: () => {
                setPlaced(true);
                onDone();
              },
            },
          );
        },
      },
    );
  };

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
    placed,
    error,
    target,
    canSubmit,
    pending: place.isPending || addTx.isPending,
    submit,
  };
}
