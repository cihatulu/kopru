import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { parseDecimal } from '@/lib/format';
import { manualEntryOptions } from '../domain/accountView';
import { useUpdateManualTransaction } from '../api/useManualTransactionEdits';
import { useRequestDeleteManualTransaction } from '../api/useManualTransactionRequests';
import type { LedgerEntry } from '../domain/ledgerEntry';
import { ManualEntryFields } from './ManualEntryFields';

interface Props {
  entry: LedgerEntry;
  counterpartyName: string;
  isManufacturer: boolean;
  counterpartyIsSubscriber: boolean;
  onClose: () => void;
}

export function EditManualTransactionDialog({
  entry,
  counterpartyName,
  isManufacturer,
  counterpartyIsSubscriber,
  onClose,
}: Props) {
  const options = manualEntryOptions(isManufacturer);
  const [type, setType] = useState<'debit' | 'credit'>(entry.type);
  const [amountText, setAmountText] = useState(String(entry.amount));
  const [description, setDescription] = useState(entry.description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateMutation = useUpdateManualTransaction();
  const deleteRequestMutation = useRequestDeleteManualTransaction();

  const isPending = updateMutation.isPending || deleteRequestMutation.isPending;

  const handleSave = () => {
    setErrorMsg(null);
    const amount = parseDecimal(amountText);
    if (amount === null || amount <= 0) {
      setErrorMsg('Geçerli bir tutar girin (örn. 50000)');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Açıklama boş bırakılamaz');
      return;
    }

    updateMutation.mutate(
      {
        transactionId: entry.id,
        type,
        amount,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Kayıt güncellenemedi');
        },
      },
    );
  };

  const handleDelete = () => {
    setErrorMsg(null);
    deleteRequestMutation.mutate(entry.id, {
      onSuccess: (data) => {
        if (data.mode === 'pending') {
          alert('Silme talebi karşı tarafa onay için gönderildi.');
        }
        onClose();
      },
      onError: (err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Silme işlemi gerçekleştirilemedi');
      },
    });
  };

  return (
    <Modal
      label={`Cari Kayıt Düzenle — ${counterpartyName}`}
      panelClassName="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/80 text-left"
      onClose={onClose}
      closeDisabled={isPending}
    >
      <div className="space-y-5">
        <header className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Cari Kayıt Düzenle — {counterpartyName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </header>

        {errorMsg && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
            {errorMsg}
          </p>
        )}

        <ManualEntryFields
          options={options}
          type={type}
          amountText={amountText}
          description={description}
          disabled={isPending}
          onTypeChange={setType}
          onAmountChange={setAmountText}
          onDescriptionChange={setDescription}
        />

        {confirmDelete ? (
          <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs text-red-800 space-y-2">
            <p className="font-bold">Bu cari kaydı silmek istediğinize emin misiniz?</p>
            {counterpartyIsSubscriber && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                ⚠️ Karşı taraf da üye olduğundan, silme işlemi karşı taraf onaylayana kadar cariye yansımaz.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-700"
              >
                Vazgeç
              </button>

              <Button
                variant="danger"
                loading={deleteRequestMutation.isPending}
                onClick={handleDelete}
              >
                Evet, Sil
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Sil
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                İptal
              </button>

              <Button
                variant="primary"
                loading={updateMutation.isPending}
                onClick={handleSave}
              >
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
