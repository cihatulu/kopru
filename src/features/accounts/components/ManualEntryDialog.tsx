import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMoney, parseDecimal } from '@/lib/format';

interface Props {
  counterpartyName: string;
  currentBalance: number;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: { type: 'debit' | 'credit'; amount: number; description: string }) => void;
}

/**
 * Elle cari hareketi.
 *
 * Yalnız perakendeci ve muhasebeci açabilir (kilitli kural 8); üretici cariyi
 * izler. Sunucu bunu ayrıca doğrular — bu ekran yalnız o kuralı görünür kılar.
 *
 * Kayıt DÜZELTİLEMEZ, yalnız dengeleyici yeni kayıtla düzeltilir (A8). Bu yüzden
 * kaydetmeden önce sonucun ne olacağı açıkça gösterilir.
 */
export function ManualEntryDialog({
  counterpartyName,
  currentBalance,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [type, setType] = useState<'debit' | 'credit'>('credit');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  const amount = parseDecimal(amountText);
  const amountInvalid = touched && (amount === null || amount === 0);
  const descriptionInvalid = touched && description.trim() === '';
  const valid = amount !== null && amount > 0 && description.trim() !== '';

  const projected =
    amount === null
      ? currentBalance
      : type === 'debit'
        ? currentBalance + amount
        : currentBalance - amount;

  return (
    <Modal
      label={'Cari hareket ekle'}
      panelClassName={'w-full max-w-md rounded-xl bg-white p-6 shadow-xl'}
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">Cari hareket ekle</h2>
      <p className="mt-1 text-sm text-slate-500">{counterpartyName}</p>

      <div className="mt-5 space-y-4">
        <div>
          <span className="label">Hareket tipi</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <TypeButton
              active={type === 'credit'}
              label="Ödeme / Alacak"
              hint="Bakiyeyi azaltır"
              onClick={() => setType('credit')}
            />
            <TypeButton
              active={type === 'debit'}
              label="Masraf / Borç"
              hint="Bakiyeyi artırır"
              onClick={() => setType('debit')}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="amount">
            Tutar
          </label>
          <input
            id="amount"
            inputMode="decimal"
            className="input"
            placeholder="0,00"
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              setTouched(true);
            }}
          />
          {amountInvalid && <p className="field-error">Sıfırdan büyük bir tutar girin</p>}
        </div>

        <div>
          <label className="label" htmlFor="description">
            Açıklama
          </label>
          <input
            id="description"
            className="input"
            placeholder="Havale, çek, nakit tahsilat…"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setTouched(true);
            }}
          />
          {descriptionInvalid && <p className="field-error">Açıklama zorunlu</p>}
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500">Şu anki bakiye</span>
            <span className="font-medium text-slate-700">{formatMoney(currentBalance)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-500">Kayıttan sonra</span>
            <span className="font-bold text-slate-900">{formatMoney(projected)}</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Kaydedilen hareket <strong>silinemez ve değiştirilemez</strong>. Hata olursa ters yönde
          yeni bir kayıt girilerek düzeltilir.
        </p>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Vazgeç
        </Button>
        <Button
          loading={pending}
          onClick={() => {
            setTouched(true);
            if (valid && amount !== null) {
              onSubmit({ type, amount, description: description.trim() });
            }
          }}
        >
          Kaydet
        </Button>
      </div>
    </Modal>
  );
}

function TypeButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-2.5 text-left ring-1 ring-inset transition-colors ${
        active
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className={`block text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>
        {hint}
      </span>
    </button>
  );
}
