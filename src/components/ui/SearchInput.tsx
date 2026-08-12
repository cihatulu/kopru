interface Props {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

/** Büyüteç ikonlu arama kutusu — presentational, veri çekmez. */
export function SearchInput({ value, placeholder, onChange }: Props) {
  return (
    <label className="relative block w-full">
      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        className="input pl-11"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
