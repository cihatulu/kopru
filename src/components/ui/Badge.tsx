import type { ReactNode } from 'react';

/*
  DURUM RENKLERİ TEK YERDE.

  Aynı anlam farklı ekranlarda farklı tonla çiziliyordu: yıkıcı/olumsuz
  için hem `red-*` hem `rose-*`, olumlu için hem `emerald-500` hem
  `emerald-700`. Kullanıcı rengi öğrenip anlamına güvenemiyordu.

  Rozetler dolu zemin değil AÇIK ZEMİN + İNCE ÇERÇEVE kullanır: bir tabloda
  yirmi satır boyunca dolu renk tekrarlanınca liste okunmaz hale geliyordu.
*/
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  /** Onaylı, aktif, tamamlandı. */
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  /** Beklemede, dikkat gerektiren ama hata olmayan durum. */
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  /** İptal, red, pasif, borç. */
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
};

/** Noktanın rengi zeminden daha doygun — küçük alanda ayırt edilebilsin. */
const DOTS: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

type Size = 'sm' | 'md';

const SIZES: Record<Size, string> = {
  sm: 'h-5 px-2 text-[10px]',
  md: 'h-6 px-2.5 text-[11px]',
};

interface Props {
  tone?: Tone;
  size?: Size;
  /** Durum noktası — sipariş/ilişki durumu gibi canlı alanlarda kullanılır. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

/** Durum etiketi. Yükseklik sabittir; satır içinde metni oynatmaz. */
export function Badge({ tone = 'neutral', size = 'md', dot = false, className = '', children }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold uppercase
        tracking-wide ring-1 ring-inset whitespace-nowrap
        ${SIZES[size]} ${TONES[tone]} ${className}`}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}
