import type { ReactNode } from 'react';

/*
  TEK YÜZEY TANIMI.

  Tarama sırasında `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`
  dizisi dosyalara elle kopyalanmış, bir kısmında `p-4`, bir kısmında
  `rounded-xl`, bir kısmında gölge yok haldeydi. Yüzey tanımı tek yerde
  durursa panel değiştiğinde kartın karakteri değişmez.
*/
export const SURFACE = 'rounded-2xl border border-slate-200 bg-white shadow-xs';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<Padding, string> = {
  /** Tablo/liste kartı: içerik kenara kadar akar, dolguyu satırlar verir. */
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

interface Props {
  /** Verilirse başlık şeridi çizilir; yoksa kart yalnız gövdedir. */
  title?: ReactNode;
  /** Başlığın altındaki açıklama satırı. */
  description?: ReactNode;
  /** Başlık şeridinin sağ ucu — düğme, rozet, sayaç. */
  actions?: ReactNode;
  padding?: Padding;
  className?: string;
  children: ReactNode;
}

/** Panel yüzeyi: isteğe bağlı başlık şeridi + gövde. */
export function Card({
  title,
  description,
  actions,
  padding = 'md',
  className = '',
  children,
}: Props) {
  const hasHeader = title !== undefined || actions !== undefined;

  return (
    <div className={`${SURFACE} ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            {/*
              Başlık her kartta aynı: küçük, kalın, harf aralığı açık.
              Eskiden kimi kart `text-base font-extrabold`, kimi
              `text-xs uppercase tracking-widest` kullanıyordu ve iki
              kart yan yana geldiğinde biri diğerinden önemliymiş gibi
              duruyordu — oysa eşitlerdi.
            */}
            <h3 className="truncate text-xs font-bold uppercase tracking-wider text-slate-500">
              {title}
            </h3>
            {description !== undefined && (
              <p className="mt-1 truncate text-xs text-slate-500 normal-case">{description}</p>
            )}
          </div>
          {actions !== undefined && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={PADDING[padding]}>{children}</div>
    </div>
  );
}
