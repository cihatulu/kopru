const FEATURES = [
  'Üretici ve perakendeci tek platformda',
  'Sipariş, sevkiyat ve iade takibi',
  'Karşılıklı cari hesap mutabakatı',
] as const;

/** Giriş ekranının sol tarafı — yalnız sunum, veri taşımaz. */
export function BrandPanel() {
  return (
    <div
      className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:w-[420px]
        lg:flex-col lg:justify-between lg:p-12"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.06) 1.5px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex items-center gap-3">
        <BrandMark />
        <span className="text-base font-bold text-white">KÖPRÜ</span>
      </div>

      <div className="relative">
        <p className="text-[2rem] font-bold leading-snug text-white">
          İki tarafı
          <br />
          <span className="text-brand-500">tek platformda</span> buluşturur.
        </p>

        <div className="mt-8 space-y-3">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
                <svg className="size-3 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-xs text-slate-600">© 2026 KÖPRÜ. Tüm hakları saklıdır.</p>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" className="text-brand-500/20" />
      <rect x="6" y="13" width="8" height="6" rx="2" fill="currentColor" className="text-brand-500" />
      <rect
        x="18"
        y="13"
        width="8"
        height="6"
        rx="2"
        fill="currentColor"
        className="text-brand-500/60"
      />
      <rect x="14" y="15" width="4" height="2" fill="currentColor" className="text-white/70" />
    </svg>
  );
}
