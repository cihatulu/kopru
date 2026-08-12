interface Option {
  value: string;
  label: string;
}

interface Props {
  options: readonly Option[];
  type: 'debit' | 'credit';
  amountText: string;
  description: string;
  disabled: boolean;
  onTypeChange: (v: 'debit' | 'credit') => void;
  onAmountChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

/** Manuel cari kaydının tür / tutar / açıklama alanları. */
export function ManualEntryFields({
  options,
  type,
  amountText,
  description,
  disabled,
  onTypeChange,
  onAmountChange,
  onDescriptionChange,
}: Props) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tür</span>
        <select
          className="input w-full font-medium"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as 'debit' | 'credit')}
          disabled={disabled}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tutar (₺)</span>
        <input
          className="input w-full font-medium"
          inputMode="decimal"
          value={amountText}
          onChange={(e) => onAmountChange(e.target.value)}
          disabled={disabled}
          placeholder="50000"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Açıklama</span>
        <input
          className="input w-full font-medium"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          placeholder="Açıklama giriniz..."
        />
      </label>
    </div>
  );
}
