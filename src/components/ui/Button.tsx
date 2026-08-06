import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary:
    'bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm
        font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner label="İşleniyor" />}
      {children}
    </button>
  );
}
