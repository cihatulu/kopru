import { useNavigate } from 'react-router-dom';
import {
  CartCheckoutPanel,
  CartLinesTable,
  CartNotice,
  DownPaymentPanel,
  OrderPlacedDialog,
  SalespersonSelect,
  useCart,
  useCheckout,
  type CartSupplier,
  type SalespersonOption,
} from '@/features/orders';
import { useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { useStaff } from '@/features/team';
import { ROUTES } from '@/constants';

/** Perakendecinin sepeti — YALNIZ KOMPOZİSYON (A20). */
export default function CartPage() {
  const { data: user } = useAuthSession();
  const { lines, totals, setCartQuantity, clearCart } = useCart();
  const counterparties = useCounterparties();
  const staff = useStaff();
  const navigate = useNavigate();

  const suppliers: CartSupplier[] = (counterparties.data?.pages.flat() ?? [])
    .filter((e) => e.status === 'active')
    .map((e) => ({
      id: e.id,
      manufacturerOrgId: e.manufacturerOrgId,
      companyName: e.manufacturer.companyName,
    }));

  // Satışçı adayları: kendi ekibinin AKTİF üyeleri. Sunucu da bunu doğruluyor.
  const salespeople: SalespersonOption[] = (staff.data ?? [])
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, label: s.fullName?.trim() || s.userCode }));

  const isSubscriber = user?.org?.isSubscriber ?? false;
  const checkout = useCheckout(lines, suppliers, isSubscriber, {
    retailerName: user?.org?.companyName ?? '',
    salespersonLabel: (id) => salespeople.find((s) => s.id === id)?.label ?? null,
  });

  const goToOrders = () => void navigate(`${ROUTES.retailer}/siparisler`);

  if (!user?.org) return null;

  if (checkout.placed && checkout.printData) {
    return (
      <OrderPlacedDialog
        orderToken={checkout.placed.orderToken}
        customerName={checkout.printData.customerName}
        customerPhone={checkout.printData.customerPhone}
        printData={checkout.printData}
        onClose={goToOrders}
        onGoToOrders={goToOrders}
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

        <CartCheckoutPanel
          checkout={checkout}
          totals={totals}
          supplierName={target.ok ? target.supplier.companyName : null}
          isSubscriber={isSubscriber}
          onSubmit={() => checkout.submit(clearCart)}
        />
      </div>
    </div>
  );
}
