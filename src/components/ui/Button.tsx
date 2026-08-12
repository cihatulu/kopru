import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary:
    'bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50',
  /** Yıkıcı eylem (sil, iptal et). İki çağrı yeri bunu zaten istiyordu. */
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
};

type Size = 'sm' | 'md';

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  /** Varsayılan — bileşenin bugüne kadarki tek boyutu. */
  md: 'px-4 py-2.5 text-sm',
};

// `| undefined` açıkça yazılır: exactOptionalPropertyTypes açıkken "hiç
// verilmedi" ile "undefined verildi" ayrı tiplerdir. Görsel prop'larda ikisi
// de aynı anlama gelir — `loading={x.isPending}` yazan her çağrı yeri geçerli.
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: Variant | undefined;
  /** `sm` çağrı yerlerinde zaten yazılıyordu ama prop tanımlı değildi. */
  size?: Size | undefined;
  loading?: boolean | undefined;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors disabled:cursor-not-allowed
        ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner label="İşleniyor" />}
      {children}
    </button>
  );
}
