import { useState } from 'react';
import { useAddFinanceTransaction } from '@/features/finance';
import { errorMessage } from '@/lib/errorMessage';
import {
  buildPrintableOrder,
  resolveCartTarget,
  toOrderCustomer,
  type CartSupplier,
} from '../domain/checkout';
import { paymentMethodLabel, type PrintableOrder } from '../domain/printOrder';
import { usePlaceOrder, type PlacedOrder } from './useOrderMutations';
import { useCheckoutForm } from './useCheckoutForm';
import type { CartLine } from '../domain/cart';

export interface CheckoutContext {
  retailerName: string;
  /** Satışçı kimliğini okunur ada çevirir — yazdırma formunda görünür. */
  salespersonLabel: (userId: string) => string | null;
}

/**
 * Sepetten sipariş verme akışı.
 *
 * Hedef ilişki SEPET SATIRLARINDAN türetilir. Satışçı zorunludur.
 * Hata YUTULMAZ; sunucu mesajı `error` ile ekrana çıkar.
 */
export function useCheckout(
  lines: CartLine[],
  suppliers: CartSupplier[],
  isSubscriber: boolean,
  ctx: CheckoutContext,
) {
  const place = usePlaceOrder();
  const addTx = useAddFinanceTransaction();
  const form = useCheckoutForm();

  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [printData, setPrintData] = useState<PrintableOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = resolveCartTarget(lines, suppliers);
  const downPayment = Number(form.paymentAmount);
  const needsPayment = isSubscriber && !form.allowNoPayment;
  const canSubmit =
    target.ok &&
    form.salespersonUserId !== '' &&
    !place.isPending &&
    !addTx.isPending &&
    (!needsPayment || downPayment > 0);

  /** Sepet temizlenmeden ÖNCE kopyalanır ki yazdırma sonradan da çalışsın. */
  const capture = (order: PlacedOrder, withPayment: boolean) =>
    setPrintData(
      buildPrintableOrder({
        lines,
        customer: form.customer,
        retailerName: ctx.retailerName,
        salespersonLabel: ctx.salespersonLabel(form.salespersonUserId),
        orderNo: order.orderNo,
        createdAt: order.createdAt,
        paymentMethodLabel: withPayment ? paymentMethodLabel(form.paymentMethod) : null,
        paymentAmount: withPayment ? downPayment : null,
      }),
    );

  const submit = (onDone: () => void) => {
    if (!target.ok) {
      setError(target.error);
      return;
    }
    if (!form.salespersonUserId) {
      setError('Lütfen satışı yapan personeli seçin.');
      return;
    }
    setError(null);

    place.mutate(
      {
        relationshipId: target.relationshipId,
        lines,
        salespersonUserId: form.salespersonUserId,
        customer: toOrderCustomer(form.customer, isSubscriber),
      },
      {
        onError: (err) => setError(errorMessage(err, 'Sipariş oluşturulamadı.')),
        onSuccess: (order) => {
          capture(order, needsPayment && downPayment > 0);

          if (!needsPayment || downPayment <= 0) {
            setPlaced(order);
            onDone();
            return;
          }
          // Peşinat siparişle aynı anda alınır ama ayrı bir defter kaydıdır.
          addTx.mutate(
            {
              type: 'income',
              method: form.paymentMethod,
              amount: downPayment,
              description: 'Sipariş anında peşinat tahsilatı',
              order_id: order.id,
              manufacturer_id: target.supplier.manufacturerOrgId,
            },
            {
              onError: (err) =>
                setError(
                  `Sipariş oluşturuldu ancak peşinat kaydedilemedi: ${errorMessage(err, 'bilinmeyen hata')}`,
                ),
              onSuccess: () => {
                setPlaced(order);
                onDone();
              },
            },
          );
        },
      },
    );
  };

  return {
    ...form,
    placed,
    printData,
    error,
    target,
    canSubmit,
    pending: place.isPending || addTx.isPending,
    submit,
  };
}
