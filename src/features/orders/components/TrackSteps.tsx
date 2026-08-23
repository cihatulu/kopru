import { TRACK_STEPS } from '../domain/tracking';

const STEP_ICONS = [
  // 1. Sipariş Alındı (Cart / Doc)
  <svg key="cart" className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>,
  // 2. Üretimde (Gear / Box)
  <svg key="prod" className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 0021 17.25l-5.87-5.83m0 0a8.003 8.003 0 01-11.57-11.57 8.003 8.003 0 0111.57 11.57z" />
  </svg>,
  // 3. Sevk Edildi (Truck)
  <svg key="ship" className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V14.25m0 4.5V18a2.25 2.25 0 01-2.25 2.25H5.25" />
  </svg>,
  // 4. Teslim Edildi (CheckBadge)
  <svg key="done" className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>,
];

/** Müşteriye gösterilen dört aşamalı modern ilerleme çubuğu (Impeccable Stepper). */
export function TrackSteps({ activeIndex }: { activeIndex: number }) {
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (TRACK_STEPS.length - 1)) * 100;

  return (
    <div className="relative flex flex-col gap-6 md:flex-row md:justify-between md:gap-2">
      {/* Bağlantı çizgisi — yalnız geniş ekranda */}
      <div className="absolute top-5 left-6 right-6 hidden md:block h-1 bg-slate-100 rounded-full z-0 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-sm"
          style={{ width: `${progress}%` }}
        />
      </div>

      {TRACK_STEPS.map((step, idx) => {
        const done = idx <= activeIndex;
        const current = idx === activeIndex;

        return (
          <div
            key={step.status}
            className="relative z-10 flex md:flex-col items-start md:items-center gap-3.5 md:gap-2.5 flex-1"
          >
            <div
              className={`size-10 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                done
                  ? current
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-4 ring-emerald-100'
                    : 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white text-slate-400 border border-slate-200/80 shadow-2xs'
              }`}
            >
              {done ? (current ? STEP_ICONS[idx] : '✓') : idx + 1}
            </div>

            <div className="md:text-center">
              <p
                className={`text-xs font-bold ${
                  current ? 'text-slate-900 font-extrabold' : done ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
              {current && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{step.desc}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
