import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLedger } from '../api/useAccounts';
import {
  useRequestManualTransaction,
  usePendingRequests,
  usePendingDeleteRequests,
} from '../api/useManualTransactionRequests';
import { formatMoney } from '@/lib/format';
import { balanceSide, BALANCE_LABEL, type AccountRow } from '../domain/accountView';
import { LedgerSection } from './LedgerSection';
import { ManualEntryPanel } from './ManualEntryPanel';
import { PendingRequestsPanel } from './PendingRequestsPanel';
import { PendingDeleteRequestsPanel } from './PendingDeleteRequestsPanel';

interface Props {
  account: AccountRow;
  isManufacturer: boolean;
  /** Elle hareket girme yetkisi: subscriber org + owner/accountant. */
  canWrite: boolean;
  /** Çağıran org'un kimliği — kimin isteği olduğunu ayırt etmek için. */
  myOrgId: string;
  onClose: () => void;
}

/**
 * HESAP DETAYI — ekstre + manuel istek + onay akışı.
 *
 * Üç bölüm:
 *   1. Ekstre   (LedgerSection)
 *   2. Bekleyen onay istekleri (PendingRequestsPanel) — karşı taraf aboneyse
 *   3. Yeni kayıt formu (ManualEntryPanel) — canWrite ise
 *
 * Bakiye listeden değil, ekstrenin son satırından okunur (A18).
 */
export function AccountDetailDialog({
  account,
  isManufacturer,
  canWrite,
  myOrgId,
  onClose,
}: Props) {
  const [saved, setSaved] = useState(0);

  const ledger  = useLedger(account.relationshipId);
  const pending = usePendingRequests(account.relationshipId);
  const pendingDeletes = usePendingDeleteRequests(account.relationshipId);
  const request = useRequestManualTransaction();

  const latest  = ledger.data?.pages[0]?.[0];
  const balance = latest ? latest.balanceAfter : account.balance;

  // Karşı taraf aboneyse: hem "bekleyen istek" paneli gösterilir
  //   hem de formdaki "Kaydet" → "Onay Gönder" olur.
  const cpIsSubscriber = account.counterpartyIsSubscriber;

  return (
    <Modal
      label={`${account.companyName} hesap detayı`}
      panelClassName="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl"
      resizable
      onClose={onClose}
      closeDisabled={request.isPending}
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-extrabold text-slate-900">{account.companyName}</h2>
          <span className="font-mono text-xs text-slate-400">({account.vknTc})</span>
          {cpIsSubscriber && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
              Üye
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={request.isPending}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
        >
          Kapat
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-6 xl:flex-row">
        {/* Sol: Ekstre */}
        <LedgerSection
          relationshipId={account.relationshipId}
          counterpartyName={account.companyName}
          isManufacturer={isManufacturer}
          canWrite={canWrite}
          counterpartyIsSubscriber={cpIsSubscriber}
        />

        {/* Sağ: Onay paneli + form */}
        <div className="w-full shrink-0 space-y-5 xl:w-80">

          {/* Bekleyen onay istekleri — karşı taraf aboneyse göster */}
          {cpIsSubscriber && (
            <>
              <PendingRequestsPanel
                requests={pending.data ?? []}
                myOrgId={myOrgId}
                canDecide={canWrite}
                counterpartyName={account.companyName}
              />
              <PendingDeleteRequestsPanel
                requests={pendingDeletes.data ?? []}
                myOrgId={myOrgId}
                canDecide={canWrite}
                counterpartyName={account.companyName}
              />
            </>
          )}

          {/* Manuel kayıt formu */}
          {canWrite && (
            <ManualEntryPanel
              // key ile form sıfırlanır: kaydedilen tutar ekranda kalırsa
              // kullanıcı geçmedi sanıp ikinci kez basabilir.
              key={saved}
              isManufacturer={isManufacturer}
              balance={balance}
              canWrite={canWrite}
              counterpartyIsSubscriber={cpIsSubscriber}
              pending={request.isPending}
              errorMessage={
                request.isError ? 'İstek gönderilemedi. Yetkinizi kontrol edin.' : undefined
              }
              onSubmit={(values) =>
                request.mutate(
                  { relationshipId: account.relationshipId, ...values },
                  { onSuccess: () => setSaved((n) => n + 1) },
                )
              }
            />
          )}

          {/* Bakiye kartı */}
          {!canWrite && (() => {
            const side = balanceSide(balance, isManufacturer);
            const tone =
              side === 'receivable'
                ? 'text-emerald-600'
                : side === 'payable'
                  ? 'text-red-600'
                  : 'text-slate-800';
            return (
              <div className="rounded-2xl border-2 border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase text-slate-500">Güncel Durum</p>
                <p className={`mt-1 text-3xl font-black ${tone}`}>
                  {formatMoney(Math.abs(balance))}
                </p>
                <p className={`mt-1 text-sm font-extrabold uppercase tracking-wide ${tone}`}>
                  {BALANCE_LABEL[side]}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
}
