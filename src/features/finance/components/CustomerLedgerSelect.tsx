import { customerLedgerKey } from '../domain/customerLedger';
import type { CustomerLedger } from '../api/useFinance';

interface Props {
  ledgers: CustomerLedger[];
  value: string;
  accentColor: string;
  accentBg: string;
  selected: CustomerLedger | undefined;
  onChange: (key: string) => void;
}

/** Tahsilat/iade penceresindeki müşteri seçimi ve güncel bakiye rozeti. */
export function CustomerLedgerSelect({
  ledgers,
  value,
  accentColor,
  accentBg,
  selected,
  onChange,
}: Props) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        Müşteri <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`input w-full ${accentColor}`}
      >
        <option value="">— Müşteri seçin —</option>
        {ledgers.map((l) => (
          <option key={customerLedgerKey(l)} value={customerLedgerKey(l)}>
            {l.customer_name} {l.customer_phone ? `(${l.customer_phone})` : ''} — Bakiye: ₺
            {l.remaining_balance.toLocaleString('tr-TR')}
          </option>
        ))}
      </select>

      {selected && (
        <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium border ${accentBg}`}>
          <span>Güncel Bakiye</span>
          <span className="font-bold text-sm">
            ₺{selected.remaining_balance.toLocaleString('tr-TR')}
          </span>
        </div>
      )}
    </div>
  );
}
