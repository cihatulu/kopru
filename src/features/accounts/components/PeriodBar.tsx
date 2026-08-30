import { Button } from '@/components/ui/Button';
import {
  EMPTY_PERIOD,
  currentMonth,
  previousMonth,
  currentYear,
  isPeriodActive,
  isPeriodInverted,
  type Period,
} from '../domain/period';

interface Props {
  period: Period;
  onChange: (p: Period) => void;
}

export function PeriodBar({ period, onChange }: Props) {
  return (
    <div className="space-y-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 sm:gap-3">
        {/* Başlangıç ve Bitiş Kutuları: Mobilde yan yana (grid-cols-2) */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3 flex-1">
          <label className="block min-w-0">
            <span className="label text-xs font-semibold text-slate-600 mb-1 block">Başlangıç</span>
            <input
              type="date"
              className="input w-full text-xs font-medium"
              value={period.from}
              onChange={(e) => onChange({ ...period, from: e.target.value })}
            />
          </label>

          <label className="block min-w-0">
            <span className="label text-xs font-semibold text-slate-600 mb-1 block">Bitiş</span>
            <input
              type="date"
              className="input w-full text-xs font-medium"
              value={period.to}
              onChange={(e) => onChange({ ...period, to: e.target.value })}
            />
          </label>
        </div>

        {/* Hızlı Seçim Butonları: Bu ay, Geçen ay, Bu yıl, Tümü */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 sm:pt-0 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onChange(currentMonth())}>
            Bu ay
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onChange(previousMonth())}>
            Geçen ay
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onChange(currentYear())}>
            Bu yıl
          </Button>
          {isPeriodActive(period) && (
            <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_PERIOD)}>
              Tümü
            </Button>
          )}
        </div>
      </div>

      {isPeriodInverted(period) && (
        <p role="alert" className="text-xs text-red-600 font-medium">
          Başlangıç tarihi bitişten sonra — bu aralıkta hiçbir hareket bulunamaz.
        </p>
      )}
    </div>
  );
}
