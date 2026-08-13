import type { DateRange, RangePreset } from '../domain/retailerReport';

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'this-month', label: 'Bu Ay' },
  { key: 'last-month', label: 'Geçen Ay' },
  { key: 'this-year', label: 'Bu Yıl' },
];

const BTN =
  'px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer';
const DATE =
  'px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10';

interface Props {
  range: DateRange;
  activePreset: RangePreset | null;
  onPreset: (preset: RangePreset) => void;
  onRange: (range: DateRange) => void;
}

/** Dönem seçimi — hazır aralıklar ve elle tarih girişi. */
export function ReportRangePicker({ range, activePreset, onPreset, onRange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onPreset(p.key)}
          className={`${BTN} ${
            activePreset === p.key
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {p.label}
        </button>
      ))}

      <input
        type="date"
        aria-label="Başlangıç tarihi"
        value={range.start}
        max={range.end}
        onChange={(e) => onRange({ ...range, start: e.target.value })}
        className={DATE}
      />
      <span className="text-slate-400">–</span>
      <input
        type="date"
        aria-label="Bitiş tarihi"
        value={range.end}
        min={range.start}
        onChange={(e) => onRange({ ...range, end: e.target.value })}
        className={DATE}
      />
    </div>
  );
}
