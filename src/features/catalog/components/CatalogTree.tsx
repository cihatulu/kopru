import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useCatalogTree } from '../api/useCatalogTree';

/**
 * Sol menüdeki grup → ürün ağacı.
 *
 * Veriyi KENDİ çeker: menüyü çizen `app/layout` katmanı veri çekmez (A20).
 * Bu bileşen katalog feature'ına ait ve yalnız kendi api hook'unu kullanır;
 * layout onu bir yuva (slot) olarak yerleştirir.
 */
export function CatalogTree({ ownerOrgId }: { ownerOrgId: string | undefined }) {
  const tree = useCatalogTree(ownerOrgId);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const activeGroup = params.get('grup');
  const activeProduct = params.get('urun');

  if (!tree.data || tree.data.length === 0) return null;

  const toggle = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // `navigate` promise döner; void'e sararak olay işleyicisine uygun hale getiriyoruz.
  const go = (query: string): void => {
    void navigate(`${ROUTES.manufacturer}/katalog?${query}`);
  };

  return (
    <ul className="mb-1 ml-3 space-y-0.5 border-l border-slate-700/60 pl-2">
      {tree.data.map((group) => {
        const key = group.id ?? 'ungrouped';
        // Aktif grup kendiliğinden açılır: kullanıcı bir gruba tıkladıysa
        // içeriğini görmek istiyor demektir.
        const expanded = openGroups.has(key) || activeGroup === group.id;

        return (
          <li key={key}>
            <div className="flex items-center">
              <button
                type="button"
                aria-label={expanded ? `${group.name} grubunu kapat` : `${group.name} grubunu aç`}
                aria-expanded={expanded}
                onClick={() => toggle(key)}
                className="flex size-5 shrink-0 items-center justify-center text-slate-500 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => go(group.id ? `grup=${group.id}` : 'grup=yok')}
                className={`flex-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  activeGroup === group.id
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {group.name}
              </button>
            </div>

            {expanded && (
              <ul className="ml-5 space-y-0.5 border-l border-slate-700/60 pl-2">
                {group.products.length === 0 && (
                  <li className="px-1.5 py-1 text-xs text-slate-600">Ürün yok</li>
                )}
                {group.products.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => go(`urun=${p.id}`)}
                      title={p.code}
                      className={`w-full truncate rounded px-1.5 py-1 text-left text-xs transition-colors ${
                        activeProduct === p.id
                          ? 'bg-slate-700/80 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
