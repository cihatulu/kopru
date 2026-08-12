import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatMoney, formatDateTime, formatDate } from '@/lib/format';
import {
  useFinanceTransactions,
  useFinanceStats,
  useCustomerLedgers,
  useAddFinanceTransaction,
  useAllOrders,
  useManufacturers,
  IncomeModal,
  ExpenseModal,
  CustomerPaymentModal,
  CustomerLedgerDetail,
  getManufacturerName,
  computeRunningBalance,
  type CustomerLedger,
} from '@/features/finance';

type TabType = 'cash' | 'pos_own' | 'pos_manufacturer' | 'customers';

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3.5 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Önceki
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sonraki
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Toplam <span className="font-semibold text-slate-800">{total}</span> kayıttan{' '}
            <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> ile{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            arası gösteriliyor
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm border border-slate-200 overflow-hidden" aria-label="Pagination">
            <button
              onClick={() => onChange(page - 1)}
              disabled={page <= 1}
              className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-30 cursor-pointer"
            >
              Önceki
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-xs font-bold text-slate-800 bg-slate-50 border-x border-slate-200">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onChange(page + 1)}
              disabled={page >= totalPages}
              className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-30 cursor-pointer"
            >
              Sonraki
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('cash');
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  const [isCustomerPaymentModalOpen, setCustomerPaymentModalOpen] = useState(false);
  const [customerPaymentMethod, setCustomerPaymentMethod] = useState<'cash' | 'pos_own' | 'pos_manufacturer'>('cash');
  const [customerPaymentMode, setCustomerPaymentMode] = useState<'payment' | 'refund'>('payment');
  const [expandedLedgers, setExpandedLedgers] = useState<string[]>([]);

  const toggleLedger = (key: string) => {
    setExpandedLedgers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const { data: transactions, isLoading: isLoadingTx } = useFinanceTransactions();
  const { data: orders, isLoading: isLoadingOrders } = useAllOrders();
  const { data: manufacturers } = useManufacturers();

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLedger | null>(null);

  const stats = useFinanceStats();
  const ledgers = useCustomerLedgers(orders);

  const addTx = useAddFinanceTransaction();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [txFilters, setTxFilters] = useState({ date: '', customerName: '', manufacturerName: '' });
  const [ledgerFilters, setLedgerFilters] = useState({ customerName: '', customerPhone: '', manufacturerName: '' });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, txFilters, ledgerFilters]);

  const cashTransactions = useMemo(
    () => computeRunningBalance(transactions?.filter(t => t.method === 'cash') ?? [], t => t.type === 'income' ? Number(t.amount) : -Number(t.amount)),
    [transactions],
  );
  const posOwnTransactions = useMemo(
    () => computeRunningBalance(transactions?.filter(t => t.method === 'pos_own') ?? [], t => t.type === 'income' ? Number(t.amount) : -Number(t.amount)),
    [transactions],
  );
  const posManufacturerTransactions = useMemo(
    () => computeRunningBalance(transactions?.filter(t => t.method === 'pos_manufacturer') ?? [], t => t.type === 'income' ? Number(t.amount) : -Number(t.amount)),
    [transactions],
  );

  const applyTxFilters = useCallback((txs: typeof cashTransactions) => {
    return txs.filter(t => {
      if (txFilters.date && !formatDateTime(t.created_at).toLowerCase().includes(txFilters.date.toLowerCase())) return false;
      const custName = t.order?.customer_name || '';
      if (txFilters.customerName && !custName.toLowerCase().includes(txFilters.customerName.toLowerCase())) return false;
      const manName = getManufacturerName(t);
      if (txFilters.manufacturerName && !manName.toLowerCase().includes(txFilters.manufacturerName.toLowerCase())) return false;
      return true;
    });
  }, [txFilters]);

  const filteredCash = useMemo(() => applyTxFilters(cashTransactions), [applyTxFilters, cashTransactions]);
  const filteredPosOwn = useMemo(() => applyTxFilters(posOwnTransactions), [applyTxFilters, posOwnTransactions]);
  const filteredPosMan = useMemo(() => applyTxFilters(posManufacturerTransactions), [applyTxFilters, posManufacturerTransactions]);

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(l => {
      if (ledgerFilters.customerName && !l.customer_name.toLowerCase().includes(ledgerFilters.customerName.toLowerCase())) return false;
      if (ledgerFilters.customerPhone && !(l.customer_phone || '').toLowerCase().includes(ledgerFilters.customerPhone.toLowerCase())) return false;
      if (ledgerFilters.manufacturerName && !(l.manufacturer_names?.join(', ') || '').toLowerCase().includes(ledgerFilters.manufacturerName.toLowerCase())) return false;
      return true;
    });
  }, [ledgers, ledgerFilters]);

  const paginatedCash = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCash.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCash, currentPage]);

  const paginatedPosOwn = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPosOwn.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPosOwn, currentPage]);

  const paginatedPosMan = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPosMan.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPosMan, currentPage]);

  const paginatedLedgers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLedgers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLedgers, currentPage]);

  if (isLoadingTx || isLoadingOrders) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const TH = 'px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';
  const TD = 'px-5 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      {/* Sayfa Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Kasa ve Finans Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">İşletmenizin nakit akışını ve müşteri carilerini yönetin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'cash' && (
            <>
              <Button onClick={() => { setCustomerPaymentMethod('cash'); setCustomerPaymentMode('refund'); setCustomerPaymentModalOpen(true); }} size="sm" variant="secondary" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                Müşteri Tahsilat İade
              </Button>
              <Button onClick={() => { setCustomerPaymentMethod('cash'); setCustomerPaymentMode('payment'); setCustomerPaymentModalOpen(true); }} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                + Müşteri Tahsilat
              </Button>
              <Button onClick={() => setIncomeModalOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                + Nakit Giriş
              </Button>
              <Button onClick={() => setExpenseModalOpen(true)} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Nakit Çıkış
              </Button>
            </>
          )}
          {activeTab === 'pos_own' && (
            <>
              <Button onClick={() => { setCustomerPaymentMethod('pos_own'); setCustomerPaymentMode('payment'); setCustomerPaymentModalOpen(true); }} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                + Müşteri POS Tahsilatı
              </Button>
              <Button onClick={() => { setCustomerPaymentMethod('pos_own'); setCustomerPaymentMode('refund'); setCustomerPaymentModalOpen(true); }} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                - Müşteri POS İade
              </Button>
            </>
          )}
          {activeTab === 'pos_manufacturer' && (
            <>
              <Button onClick={() => { setCustomerPaymentMethod('pos_manufacturer'); setCustomerPaymentMode('payment'); setCustomerPaymentModalOpen(true); }} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                + Müşteri POS Tahsilatı
              </Button>
              <Button onClick={() => { setCustomerPaymentMethod('pos_manufacturer'); setCustomerPaymentMode('refund'); setCustomerPaymentModalOpen(true); }} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                - Müşteri POS İade
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { key: 'cash' as TabType, label: 'Kasa Hesabı (Nakit)' },
          { key: 'pos_own' as TabType, label: 'Bizim POS (Banka)' },
          { key: 'pos_manufacturer' as TabType, label: 'Üretici POS' },
          { key: 'customers' as TabType, label: 'Müşteri Carileri', count: ledgers?.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                activeTab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab İçeriği */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm min-h-[400px]">
        {activeTab === 'cash' && (
          <div className="space-y-6">
            {/* Nakit Kasa Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Güncel Nakit Kasa</p>
                <p className="text-2xl font-black text-slate-900">{formatMoney(stats.cash_balance)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Nakit Girişi</p>
                <p className="text-xl font-bold text-slate-900">{formatMoney(stats.total_cash_income)}</p>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100/50">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Nakit Çıkışı</p>
                <p className="text-xl font-bold text-slate-900">{formatMoney(stats.total_cash_expense)}</p>
              </div>
            </div>

            {/* Arama & Filtreler */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Tarihe göre ara..." className="input text-xs w-full" value={txFilters.date} onChange={e => setTxFilters(p => ({...p, date: e.target.value}))} />
              <input type="text" placeholder="Müşteriye göre ara..." className="input text-xs w-full" value={txFilters.customerName} onChange={e => setTxFilters(p => ({...p, customerName: e.target.value}))} />
              <input type="text" placeholder="Üreticiye göre ara..." className="input text-xs w-full" value={txFilters.manufacturerName} onChange={e => setTxFilters(p => ({...p, manufacturerName: e.target.value}))} />
            </div>

            {/* Tablo */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={TH}>Tarih</th>
                    <th className={TH}>Müşteri Adı</th>
                    <th className={TH}>Üretici Adı</th>
                    <th className={TH}>Açıklama</th>
                    <th className={`${TH} text-right text-emerald-600`}>Borç (Giriş)</th>
                    <th className={`${TH} text-right text-rose-600`}>Alacak (Çıkış)</th>
                    <th className={`${TH} text-right`}>Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCash.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${TD} text-slate-500`}>{formatDateTime(t.created_at)}</td>
                      <td className={`${TD} font-semibold text-slate-800`}>{t.order?.customer_name || '—'}</td>
                      <td className={`${TD} text-slate-600`}>{getManufacturerName(t)}</td>
                      <td className={`${TD} text-slate-600 max-w-[200px] truncate`} title={t.description || ''}>{t.description || '—'}</td>
                      <td className={`${TD} text-right font-semibold text-emerald-600`}>
                        {t.type === 'income' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-semibold text-rose-600`}>
                        {t.type === 'expense' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-bold text-slate-900`}>{formatMoney(t.runningBalance)}</td>
                    </tr>
                  ))}
                  {filteredCash.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Nakit işlemi bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} pageSize={ITEMS_PER_PAGE} total={filteredCash.length} onChange={setCurrentPage} />
          </div>
        )}

        {activeTab === 'pos_own' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Bizim POS Toplam</p>
                <p className="text-2xl font-black text-slate-900">{formatMoney(stats.total_pos_own)}</p>
                <p className="text-xs text-slate-500 mt-1">Sizin banka hesabınıza geçen tutarlar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Tarihe göre ara..." className="input text-xs w-full" value={txFilters.date} onChange={e => setTxFilters(p => ({...p, date: e.target.value}))} />
              <input type="text" placeholder="Müşteriye göre ara..." className="input text-xs w-full" value={txFilters.customerName} onChange={e => setTxFilters(p => ({...p, customerName: e.target.value}))} />
              <input type="text" placeholder="Üreticiye göre ara..." className="input text-xs w-full" value={txFilters.manufacturerName} onChange={e => setTxFilters(p => ({...p, manufacturerName: e.target.value}))} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={TH}>Tarih</th>
                    <th className={TH}>Müşteri Adı</th>
                    <th className={TH}>Üretici Adı</th>
                    <th className={TH}>Açıklama</th>
                    <th className={`${TH} text-right text-emerald-600`}>Borç (Giriş)</th>
                    <th className={`${TH} text-right text-rose-600`}>Alacak (Çıkış)</th>
                    <th className={`${TH} text-right`}>Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPosOwn.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${TD} text-slate-500`}>{formatDateTime(t.created_at)}</td>
                      <td className={`${TD} font-semibold text-slate-800`}>{t.order?.customer_name || '—'}</td>
                      <td className={`${TD} text-slate-600`}>{getManufacturerName(t)}</td>
                      <td className={`${TD} text-slate-600`} title={t.description || ''}>{t.description || '—'}</td>
                      <td className={`${TD} text-right font-semibold text-emerald-600`}>
                        {t.type === 'income' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-semibold text-rose-600`}>
                        {t.type === 'expense' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-bold text-slate-900`}>{formatMoney(t.runningBalance)}</td>
                    </tr>
                  ))}
                  {filteredPosOwn.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Bizim POS işlemi bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} pageSize={ITEMS_PER_PAGE} total={filteredPosOwn.length} onChange={setCurrentPage} />
          </div>
        )}

        {activeTab === 'pos_manufacturer' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100/50">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Üretici POS Toplam</p>
                <p className="text-2xl font-black text-slate-900">{formatMoney(stats.total_pos_manufacturer)}</p>
                <p className="text-xs text-slate-500 mt-1">Üretici carilerinden düşülen tutarlar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Tarihe göre ara..." className="input text-xs w-full" value={txFilters.date} onChange={e => setTxFilters(p => ({...p, date: e.target.value}))} />
              <input type="text" placeholder="Müşteriye göre ara..." className="input text-xs w-full" value={txFilters.customerName} onChange={e => setTxFilters(p => ({...p, customerName: e.target.value}))} />
              <input type="text" placeholder="Üreticiye göre ara..." className="input text-xs w-full" value={txFilters.manufacturerName} onChange={e => setTxFilters(p => ({...p, manufacturerName: e.target.value}))} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={TH}>Tarih</th>
                    <th className={TH}>Müşteri Adı</th>
                    <th className={TH}>Üretici Adı</th>
                    <th className={TH}>Açıklama</th>
                    <th className={`${TH} text-right text-emerald-600`}>Borç (Giriş)</th>
                    <th className={`${TH} text-right text-rose-600`}>Alacak (Çıkış)</th>
                    <th className={`${TH} text-right`}>Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPosMan.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${TD} text-slate-500`}>{formatDateTime(t.created_at)}</td>
                      <td className={`${TD} font-semibold text-slate-800`}>{t.order?.customer_name || '—'}</td>
                      <td className={`${TD} text-slate-600`}>{getManufacturerName(t)}</td>
                      <td className={`${TD} text-slate-600`} title={t.description || ''}>{t.description || '—'}</td>
                      <td className={`${TD} text-right font-semibold text-emerald-600`}>
                        {t.type === 'income' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-semibold text-rose-600`}>
                        {t.type === 'expense' ? formatMoney(t.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-bold text-slate-900`}>{formatMoney(t.runningBalance)}</td>
                    </tr>
                  ))}
                  {filteredPosMan.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Üretici POS işlemi bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} pageSize={ITEMS_PER_PAGE} total={filteredPosMan.length} onChange={setCurrentPage} />
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Müşteriye göre ara..." className="input text-xs w-full" value={ledgerFilters.customerName} onChange={e => setLedgerFilters(p => ({...p, customerName: e.target.value}))} />
              <input type="text" placeholder="Telefona göre ara..." className="input text-xs w-full" value={ledgerFilters.customerPhone} onChange={e => setLedgerFilters(p => ({...p, customerPhone: e.target.value}))} />
              <input type="text" placeholder="Üreticiye göre ara..." className="input text-xs w-full" value={ledgerFilters.manufacturerName} onChange={e => setLedgerFilters(p => ({...p, manufacturerName: e.target.value}))} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={TH}>Müşteri Adı</th>
                    <th className={TH}>Müşteri Telefonu</th>
                    <th className={TH}>Üretici Adı</th>
                    <th className={TH}>Sipariş No</th>
                    <th className={`${TH} text-right text-rose-600`}>Borç (Sipariş)</th>
                    <th className={`${TH} text-right text-emerald-600`}>Alacak (Ödeme)</th>
                    <th className={`${TH} text-right`}>Bakiye</th>
                    <th className={`${TH} w-[150px] text-right pr-6`}>İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLedgers.map((l) => {
                    const ledgerKey = `${l.customer_name}-${l.customer_phone}`;
                    const isExpanded = expandedLedgers.includes(ledgerKey);
                    return (
                      <React.Fragment key={ledgerKey}>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className={`${TD} font-semibold text-slate-800`}>{l.customer_name}</td>
                          <td className={`${TD} text-slate-500`}>{l.customer_phone || '—'}</td>
                          <td className={`${TD} text-slate-600`}>{l.manufacturer_names?.join(', ') || '—'}</td>
                          <td className={`${TD} font-mono font-bold text-slate-800`}>
                            {orders?.filter(o => l.order_ids.includes(o.id)).map(o => o.orderNo).join(', ') || '—'}
                          </td>
                          <td className={`${TD} text-right font-semibold text-rose-600`}>
                            {l.total_order_amount > 0 ? formatMoney(l.total_order_amount) : '—'}
                          </td>
                          <td className={`${TD} text-right font-semibold text-emerald-600`}>
                            {l.total_paid_amount > 0 ? formatMoney(l.total_paid_amount) : '—'}
                          </td>
                          <td className={`${TD} text-right font-bold text-slate-900`}>{formatMoney(l.remaining_balance)}</td>
                          <td className={`${TD} text-right pr-6`}>
                            <div className="flex justify-end gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomer(l)}
                                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                Müşteri Bilgileri
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleLedger(ledgerKey)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                              >
                                {isExpanded ? 'Detay Kapat' : 'Detay Aç'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${ledgerKey}-detail`}>
                            <td colSpan={8} className="px-5 py-2 bg-slate-50/30">
                              <CustomerLedgerDetail
                                ledger={l}
                                orders={orders || []}
                                transactions={transactions || []}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredLedgers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">Müşteri carisi bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} pageSize={ITEMS_PER_PAGE} total={filteredLedgers.length} onChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* Modaller */}
      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setExpenseModalOpen(false)}
          onSubmit={(data) => {
            addTx.mutate(data, {
              onSuccess: () => setExpenseModalOpen(false)
            });
          }}
          isSubmitting={addTx.isPending}
          error={addTx.isError ? (addTx.error as Error).message : null}
        />
      )}
      {isIncomeModalOpen && (
        <IncomeModal
          onClose={() => setIncomeModalOpen(false)}
          onSubmit={(data) => {
            addTx.mutate(data, {
              onSuccess: () => setIncomeModalOpen(false)
            });
          }}
          isSubmitting={addTx.isPending}
          error={addTx.isError ? (addTx.error as Error).message : null}
        />
      )}
      {isCustomerPaymentModalOpen && (
        <CustomerPaymentModal
          isOpen={isCustomerPaymentModalOpen}
          onClose={() => setCustomerPaymentModalOpen(false)}
          method={customerPaymentMethod}
          mode={customerPaymentMode}
          ledgers={ledgers || []}
          manufacturers={manufacturers || []}
          isLoading={addTx.isPending}
          onSubmit={(data) => {
            addTx.mutate({
              type: customerPaymentMode === 'refund' ? 'expense' : 'income',
              method: customerPaymentMethod,
              amount: data.amount,
              description: data.description,
              order_id: data.orderId,
              manufacturer_id: data.manufacturerId,
            }, {
              onSuccess: () => setCustomerPaymentModalOpen(false)
            });
          }}
        />
      )}

      {selectedCustomer && (
        <Modal label="Müşteri Bilgileri" onClose={() => setSelectedCustomer(null)}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Müşteri Bilgileri</h3>
              <p className="text-sm text-slate-500">{selectedCustomer.customer_name}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm text-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Telefon</label>
                <div>{selectedCustomer.customer_phone || '—'}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Adres</label>
                <div>{selectedCustomer.customer_address || 'Belirtilmemiş.'}</div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
