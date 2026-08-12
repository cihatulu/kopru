import { useState } from 'react';
import {
  AccountDetailDialog,
  AccountsTable,
  filterAccounts,
  useLedgerAccounts,
  type AccountRow,
} from '@/features/accounts';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

/** Cari Hesaplar — liste + hesap detayı. YALNIZ KOMPOZİSYON (A20). */
export default function AccountsPage() {
  const { data: user } = useAuthSession();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<AccountRow | null>(null);

  const accounts = useLedgerAccounts();

  if (!user?.org) return null;

  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  /**
   * KİLİTLİ KURAL 8 (son hali):
   *   - Yalnız ABONE org yazabilir (misafir izler).
   *   - Abone org içinde yalnız owner veya accountant.
   *   - Sunucu da bu kontrolü yapar (request_manual_transaction RPC).
   */
  const canWrite =
    user.org.isSubscriber &&
    (user.orgRole === 'owner' || user.orgRole === 'accountant');

  const rows = filterAccounts(accounts.data ?? [], search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Cari Hesaplar</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Tutarlar üreticinin satış fiyatı üzerinden işler. Kayıtlar silinemez; düzeltme ters
            yönde yeni kayıtla yapılır.
          </p>
        </div>
        <label className="w-full sm:w-72">
          <span className="sr-only">Firma ara</span>
          <input
            className="input"
            placeholder="Firma adı veya VKN ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {accounts.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : accounts.isError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Cari hesaplar yüklenemedi.
        </p>
      ) : (
        <AccountsTable rows={rows} isManufacturer={isManufacturer} onOpen={setOpen} />
      )}

      {open && (
        <AccountDetailDialog
          account={open}
          isManufacturer={isManufacturer}
          canWrite={canWrite}
          myOrgId={user.org.id}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
