interface Field {
  key: string;
  placeholder: string;
  value: string;
}

interface Props {
  fields: Field[];
  onChange: (key: string, value: string) => void;
}

/** Üç kutuluk arama şeridi — sekmeye göre alanları değişir. */
export function FinanceFilterBar({ fields, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {fields.map((f) => (
        <input
          key={f.key}
          type="text"
          placeholder={f.placeholder}
          className="input text-xs w-full"
          value={f.value}
          onChange={(e) => onChange(f.key, e.target.value)}
        />
      ))}
    </div>
  );
}
