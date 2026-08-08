import { Button } from '@/components/ui/Button';
import {
  EMPTY_PERIOD,
  currentMonth,
  isPeriodActive,
  isPeriodInverted,
  previousMonth,
  type Period,
} from '../domain/period';

interface Props {
  period: Period;
  onChange: (p: Period) => void;
}

export function PeriodBar({ period, onChange }: Props) {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[8.5rem]">
          <span className="label">Başlangıç</span>
          <input
            type="date"
            className="input"
            value={period.from}
            onChange={(e) => onChange({ ...period, from: e.target.value })}
          />
        </label>

        <label className="min-w-[8.5rem]">
          <span className="label">Bitiş</span>
          <input
            type="date"
            className="input"
            value={period.to}
            onChange={(e) => onChange({ ...period, to: e.target.value })}
          />
        </label>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onChange(currentMonth())}>
            Bu ay
          </Button>
          <Button variant="secondary" onClick={() => onChange(previousMonth())}>
            Geçen ay
          </Button>
          {isPeriodActive(period) && (
            <Button variant="ghost" onClick={() => onChange(EMPTY_PERIOD)}>
              Tümü
            </Button>
          )}
        </div>
      </div>

      {isPeriodInverted(period) && (
        <p role="alert" className="text-xs text-red-600">
          Başlangıç tarihi bitişten sonra — bu aralıkta hiçbir hareket bulunamaz.
        </p>
      )}
    </div>
  );
}
