export function Spinner({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block size-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
    />
  );
}
