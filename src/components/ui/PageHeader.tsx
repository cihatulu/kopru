import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Tek satırlık açıklama — sayfanın ne işe yaradığı. */
  description?: string;
  /** Sağ uç: birincil eylem düğmeleri. */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Sayfa başlığı — üç panelde de aynı.
 *
 * Yönetici, üretici ve perakendeci sayfaları başlıklarını kendi
 * ölçüleriyle yazıyordu (`text-xl` / `text-2xl` / `text-lg`, kimi kalın
 * kimi ekstra kalın). Aynı ürünün üç ayrı yerinde farklı bir hiyerarşi
 * kuruluyordu; tek bileşen bunu kapatır.
 */
export function PageHeader({ title, description, actions, children }: Props) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description !== undefined && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {/*
          Eylemler her zaman sağ üstte. Boyut `Button`'ın kendi
          varsayılanına bırakılır — burada boyut dayatmak, çağrı yerinin
          `size` vermesini anlamsız kılardı.
        */}
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children !== undefined && <div className="mt-4">{children}</div>}
    </div>
  );
}
