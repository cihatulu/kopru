import { useState } from 'react';
import { useAddFinanceTransaction } from '@/features/finance';
import { resolveCartTarget, type CartSupplier } from '../domain/checkout';
import { usePlaceOrder } from './useOrderMutations';
import type { CartLine } from '../domain/cart';

export type PaymentMethod = 'cash' | 'pos_own' | 'pos_manufacturer';

export interface CustomerFields {
  name: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  address: string;
  note: string;
}

const EMPTY_CUSTOMER: CustomerFields = {
  name: '',
  phone: '',
  email: '',
  province: '',
  district: '',
  address: '',
  note: '',
};

/** Boş metin gönderilmez: RPC `nullif` uyguluyor ama niyeti burada da netleştiriyoruz. */
const trimmed = (v: string) => v.trim() || undefined;

/**
 * Sepetten sipariş verme akışı.
 *
 * Hedef ilişki SEPET SATIRLARINDAN türetilir (bkz. `resolveCartTarget`).
 * Hata artık YUTULMUYOR: sunucudan gelen mesaj `error` ile ekrana çıkar —
 * eskiden butona basılıyor ve hiçbir şey olmuyordu.
 */
export function useCheckout(lines: CartLine[], suppliers: CartSupplier[], isSubscriber: boolean) {
  const place = usePlaceOrder();
  const addTx = useAddFinanceTransaction();

  const [customer, setCustomer] = useState<CustomerFields>(EMPTY_CUSTOMER);
  const [allowNoPayment, setAllowNoPayment] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = resolveCartTarget(lines, suppliers);
  const downPayment = Number(paymentAmount);
  const needsPayment = isSubscriber && !allowNoPayment;
  const canSubmit =
    target.ok && !place.isPending && !addTx.isPending && (!needsPayment || downPayment > 0);

  const submit = (onDone: () => void) => {
    if (!target.ok) {
      setError(target.error);
      return;
    }
    setError(null);

    place.mutate(
      {
        relationshipId: target.relationshipId,
        lines,
        customer: {
          name: trimmed(customer.name),
          note: trimmed(customer.note),
          // Adres ve iletişim yalnız abone perakendecide toplanır.
          ...(isSubscriber
            ? {
                phone: trimmed(customer.phone),
                email: trimmed(customer.email),
                province: trimmed(customer.province),
                district: trimmed(customer.district),
                address: trimmed(customer.address),
              }
            : {}),
        },
      },
      {
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Sipariş oluşturulamadı.'),
        onSuccess: (orderId) => {
          if (!needsPayment || downPayment <= 0) {
            setPlaced(true);
            onDone();
            return;
          }
          // Peşinat siparişle AYNI anda yazılır ama ayrı bir defter kaydıdır.
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
                  `Sipariş oluşturuldu ancak peşinat kaydedilemedi: ${
                    err instanceof Error ? err.message : 'bilinmeyen hata'
                  }`,
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
    placed,
    error,
    target,
    canSubmit,
    pending: place.isPending || addTx.isPending,
    submit,
  };
}
