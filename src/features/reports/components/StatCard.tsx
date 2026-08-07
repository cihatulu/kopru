interface Props {
  label: string;
  value: string;
  /** Değer hesaplanamıyorsa nedenini söyler — boş bir sayı göstermekten iyidir. */
  hint?: string | undefined;
  tone?: 'default' | 'positive' | 'muted';
}

const TONES = {
  default: 'text-slate-900',
  positive: 'text-emerald-700',
  muted: 'text-slate-400',
} as const;

export function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
