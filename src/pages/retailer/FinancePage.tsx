import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import {
  CustomerLedgerTable,
  FINANCE_PAGE_SIZE,
  FinanceFilterBar,
  FinanceModals,
  FinanceSummary,
  FinanceTabs,
  FinanceToolbar,
  FinanceTxTable,
  computeFinanceStats,
  useAddFinanceTransaction,
  useFinancePage,
  type CustomerLedger,
  type FinanceModalKind,
  type PaymentTarget,
} from '@/features/finance';

const EMPTY_TEXT = {
  cash: 'Nakit işlemi bulunmuyor.',
  pos_own: 'Bizim POS işlemi bulunmuyor.',
  pos_manufacturer: 'Üretici POS işlemi bulunmuyor.',
};

/** Kasa ve finans yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function FinancePage() {
  const page = useFinancePage();
  const addTx = useAddFinanceTransaction();

  const [modal, setModal] = useState<FinanceModalKind>('none');
  const [target, setTarget] = useState<PaymentTarget>({ method: 'cash', mode: 'payment' });
  const [customer, setCustomer] = useState<CustomerLedger | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  if (page.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  // `null` = müşteri carileri sekmesi. Daraltma böyle yapılıyor: `page.tab`
  // doğrudan `page.tx` anahtarı olarak kullanılamaz, 'customers' orada yok.
  const txTab = page.tab === 'customers' ? null : page.tab;
  const view = txTab ? page.tx[txTab] : page.customers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Kasa ve Finans Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">
            İşletmenizin nakit akışını ve müşteri carilerini yönetin.
          </p>
        </div>
        <FinanceToolbar
          tab={page.tab}
          onCustomerPayment={(t) => { setTarget(t); setModal('payment'); }}
          onIncome={() => setModal('income')}
          onExpense={() => setModal('expense')}
        />
      </div>

      <FinanceTabs active={page.tab} customerCount={page.ledgers.length} onSelect={page.setTab} />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm min-h-[400px] space-y-6">
        <FinanceSummary tab={page.tab} stats={computeFinanceStats(page.transactions)} />

        {txTab === null ? (
          <FinanceFilterBar
            fields={[
              { key: 'customerName', placeholder: 'Müşteriye göre ara...', value: page.ledgerFilters.customerName },
              { key: 'customerPhone', placeholder: 'Telefona göre ara...', value: page.ledgerFilters.customerPhone },
              { key: 'manufacturerName', placeholder: 'Üreticiye göre ara...', value: page.ledgerFilters.manufacturerName },
            ]}
            onChange={(key, value) => page.setLedgerFilters((p) => ({ ...p, [key]: value }))}
          />
        ) : (
          <FinanceFilterBar
            fields={[
              { key: 'date', placeholder: 'Tarihe göre ara...', value: page.txFilters.date },
              { key: 'customerName', placeholder: 'Müşteriye göre ara...', value: page.txFilters.customerName },
              { key: 'manufacturerName', placeholder: 'Üreticiye göre ara...', value: page.txFilters.manufacturerName },
            ]}
            onChange={(key, value) => page.setTxFilters((p) => ({ ...p, [key]: value }))}
          />
        )}

        {txTab === null ? (
          <CustomerLedgerTable
            ledgers={page.customers.rows}
            orders={page.orders}
            transactions={page.transactions}
            returnRequests={page.returnRequests}
            expandedKeys={expandedKeys}
            isEmpty={page.customers.total === 0}
            onToggle={(key) =>
              setExpandedKeys((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
              )
            }
            onShowCustomer={setCustomer}
          />
        ) : (
          <FinanceTxTable
            rows={page.tx[txTab].rows}
            emptyText={EMPTY_TEXT[txTab]}
            isEmpty={page.tx[txTab].total === 0}
          />
        )}

        <Pagination
          page={page.page}
          pageSize={FINANCE_PAGE_SIZE}
          total={view.total}
          onChange={page.setPage}
        />
      </div>

      <FinanceModals
        kind={modal}
        target={target}
        ledgers={page.ledgers}
        manufacturers={page.manufacturers}
        customer={customer}
        pending={addTx.isPending}
        error={addTx.error?.message ?? null}
        onClose={() => setModal('none')}
        onCloseCustomer={() => setCustomer(null)}
        onSubmit={(draft) => addTx.mutate(draft, { onSuccess: () => setModal('none') })}
      />
    </div>
  );
}
