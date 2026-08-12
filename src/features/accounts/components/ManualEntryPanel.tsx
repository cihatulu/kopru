import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatMoney, parseDecimal } from '@/lib/format';
import { BALANCE_LABEL, balanceSide, manualEntryOptions } from '../domain/accountView';

interface Props {
  isManufacturer: boolean;
  balance: number;
  /** Yetkisi olmayan taraf yalnız GÜNEL DURUM kartını görür. */
  canWrite: boolean;
  /**
   * Karşı taraf abone mu?
   * true  → "Onay Gönder" modu (kayıt bekler)
   * false → "Kaydet" modu (doğrudan işlenir)
   */
  counterpartyIsSubscriber: boolean;
  pending: boolean;
  errorMessage?: string | undefined;
  onSubmit: (values: { type: 'debit' | 'credit'; amount: number; description: string }) => void;
}

/**
 * "Manuel İşlem Ekle" — ekstrenin yanındaki panel.
 *
 * İki taraf da kayıt girebilir ama metinler bakış açısına göre değişir:
 * üretici "Tahsilat / Ödeme Alındı" yazar, perakendeci "Ödeme Yaptım".
 * Ortak bir metin ikisinden birine sürekli ters okunurdu.
 *
 * Kayıt SİLİNEMEZ ve düzeltilemez (A8); düzeltme ters yönde yeni kayıtla
 * yapılır. Panel bunu açıkça söylüyor.
 */
export function ManualEntryPanel({
  isManufacturer,
  balance,
  canWrite,
  counterpartyIsSubscriber,
  pending,
  errorMessage,
  onSubmit,
}: Props) {
  const options = manualEntryOptions(isManufacturer);
  const [type, setType] = useState<'debit' | 'credit'>(options[0]!.value);
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');

  const amount = parseDecimal(amountText);
  const ready = amount !== null && amount > 0 && description.trim() !== '';

  const side = balanceSide(balance, isManufacturer);
  const tone =
    side === 'receivable'
      ? 'text-emerald-600'
      : side === 'payable'
        ? 'text-red-600'
        : 'text-slate-800';

  return (
    <div className="w-full shrink-0 space-y-6 xl:w-80">
      {canWrite && (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h4 className="font-bold text-slate-800">Manuel İşlem Ekle</h4>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
              İşlem Tipi
            </span>
            <select
              className="input font-bold"
              value={type}
              onChange={(e) => setType(e.target.value as 'debit' | 'credit')}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
              Tutar (₺)
            </span>
            <input
              className="input font-bold"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
              Açıklama
            </span>
            <input
              className="input"
              placeholder="Havale, çek, nakit…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {counterpartyIsSubscriber && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-bold text-amber-800">⚠️ Onay gerekiyor
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                Karşı taraf da abone olduğundan bu kayıt onaylanana kadar cariye işlenmez.
              </p>
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
              {errorMessage}
            </p>
          )}

          <Button
            className="w-full justify-center"
            loading={pending}
            disabled={!ready}
            onClick={() =>
              amount !== null &&
              onSubmit({ type, amount, description: description.trim() })
            }
          >
            {counterpartyIsSubscriber ? 'Onay Gönder' : 'Kaydet'}
          </Button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Kayıt silinemez ve değiştirilemez. Hata olursa ters yönde yeni bir kayıt girilerek
            düzeltilir.
          </p>
        </div>
      </div>
      )}

      <div className="rounded-2xl border-2 border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase text-slate-500">Güncel Durum (Sizden)</p>
        <p className={`mt-1 text-3xl font-black ${tone}`}>{formatMoney(Math.abs(balance))}</p>
        <p className={`mt-1 text-sm font-extrabold uppercase tracking-wide ${tone}`}>
          {BALANCE_LABEL[side]}
        </p>
      </div>
    </div>
  );
}
