import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost' | 'success';

/*
  RENK = ANLAM. Birincil eylem her panelde aynı marka mavisidir; yönetici,
  üretici ve perakendeci ekranları arasında renk değiştirmez.

  Marka rengi `--color-brand-*` üzerinden gelir ve org branding'i bunu
  runtime'da override eder — bu yüzden burada indigo/blue gibi sabit bir
  ton YAZILMAZ, yoksa müşteri kendi rengini verdiğinde düğmeler dönmez.
*/
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:bg-brand-600/45',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  /** Yıkıcı eylem (sil, iptal et). */
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 disabled:bg-red-600/45',
  /**
   * Tablo satırındaki yıkıcı eylem. Dolu kırmızı bir düğme her satırda
   * tekrarlanınca liste kırmızıya boğuluyordu; burada renk yalnız metinde
   * durur, zemin hover'da gelir.
   */
  dangerGhost: 'text-red-600 hover:bg-red-50 disabled:opacity-50',
  /** Onaylama/tamamlama — "teslim al", "kabul et" gibi ileri yönlü eylem. */
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 disabled:bg-emerald-600/45',
};

type Size = 'xs' | 'sm' | 'md' | 'lg';

/*
  YÜKSEKLİK SABİT — bu bileşenin en önemli kararı.

  Eskiden boyut yalnız `px/py` ile veriliyordu; içeriği farklı iki düğme
  (ikonlu / ikonsuz, tek satır / uzun etiket) aynı satırda FARKLI
  yükseklikte çiziliyordu. Sabit `h-*` ile aynı satırdaki her düğme,
  içeriği ne olursa olsun, aynı yükseklikte durur.

  `md` = 36px, `.input` yüksekliğiyle bilerek eşittir: form satırında
  girdi ile düğme aynı çizgide biter.
*/
const SIZES: Record<Size, string> = {
  xs: 'h-7 gap-1 px-2.5 text-[11px]',
  sm: 'h-8 gap-1.5 px-3 text-xs',
  /** Varsayılan. */
  md: 'h-9 gap-2 px-4 text-sm',
  lg: 'h-10 gap-2 px-5 text-sm',
};

/** İkon-yalnız düğmede genişlik yüksekliğe eşitlenir — kare buton. */
const ICON_SIZES: Record<Size, string> = {
  xs: 'h-7 w-7 px-0',
  sm: 'h-8 w-8 px-0',
  md: 'h-9 w-9 px-0',
  lg: 'h-10 w-10 px-0',
};

// `| undefined` açıkça yazılır: exactOptionalPropertyTypes açıkken "hiç
// verilmedi" ile "undefined verildi" ayrı tiplerdir. Görsel prop'larda ikisi
// de aynı anlama gelir — `loading={x.isPending}` yazan her çağrı yeri geçerli.
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: Variant | undefined;
  size?: Size | undefined;
  loading?: boolean | undefined;
  /** Kare ikon düğmesi. `aria-label` vermek zorunludur. */
  iconOnly?: boolean | undefined;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconOnly = false,
  disabled,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      // `type` bilerek varsayılanlanmaz. 16 form `<Button>`'ın örtük
      // `submit` davranışına bağlı; varsayılanı `button` yapmak onları
      // sessizce çalışmaz hale getirirdi.
      disabled={disabled ?? loading}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-lg
        font-semibold whitespace-nowrap transition-colors
        disabled:cursor-not-allowed
        ${iconOnly ? ICON_SIZES[size] : SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner label="İşleniyor" />}
      {children}
    </button>
  );
}
