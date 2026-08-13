import { TRACK_STEPS } from '../domain/tracking';

/** Müşteriye gösterilen dört aşamalı ilerleme çubuğu. */
export function TrackSteps({ activeIndex }: { activeIndex: number }) {
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (TRACK_STEPS.length - 1)) * 100;

  return (
    <div className="relative flex flex-col gap-6 md:flex-row md:justify-between md:gap-2">
      {/* Bağlantı çizgisi — yalnız geniş ekranda */}
      <div className="absolute top-4 left-4 right-4 hidden md:block h-0.5 bg-slate-100 z-0">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {TRACK_STEPS.map((step, idx) => {
        const done = idx <= activeIndex;
        const current = idx === activeIndex;

        return (
          <div
            key={step.status}
            className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-2 flex-1"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
                done
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                  : 'bg-white text-slate-400 border-2 border-slate-200'
              }`}
            >
              {done ? '✓' : idx + 1}
            </div>

            <div className="md:text-center">
              <p
                className={`text-xs font-bold ${current ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {step.label}
              </p>
              {current && <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
