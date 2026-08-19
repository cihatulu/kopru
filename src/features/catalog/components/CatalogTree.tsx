import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useCatalogTree } from '../api/useCatalogTree';
import { TreeBranch } from './TreeBranch';

/**
 * Sol menüdeki GRUP → KATEGORİ → ÜRÜN ağacı.
 *
 * Veriyi KENDİ çeker: menüyü çizen `app/layout` katmanı veri çekmez (A20).
 * Bu bileşen katalog feature'ına ait ve yalnız kendi api hook'unu kullanır;
 * layout onu bir yuva (slot) olarak yerleştirir.
 */
export function CatalogTree({ ownerOrgId }: { ownerOrgId: string | undefined }) {
  const tree = useCatalogTree(ownerOrgId);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const activeGroup = params.get('grup');
  const activeProduct = params.get('urun');

  if (!tree.data || tree.data.length === 0) return null;

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // `navigate` promise döner; void'e sararak olay işleyicisine uygun hale getiriyoruz.
  const go = (query: string): void => {
    void navigate(`${ROUTES.manufacturer}/katalog?${query}`);
  };

  return (
    <ul key={location.pathname} className="mb-1 ml-3 space-y-0.5 border-l border-slate-700/60 pl-2">
      {tree.data.map((group) => {
        const groupKey = group.id ?? 'grupsuz';
        // Aktif grup kendiliğinden açılır: kullanıcı ona tıkladıysa içeriğini
        // görmek istiyor demektir.
        const groupProducts = group.categories
          .flatMap((c) => c.products)
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        const hasActiveProduct = groupProducts.some((p) => p.id === activeProduct);
        const groupOpen = open.has(groupKey) || activeGroup === group.id || hasActiveProduct;

        return (
          <TreeBranch
            key={groupKey}
            label={group.name}
            emphasis
            expanded={groupOpen}
            active={activeGroup === group.id && !activeProduct}
            onToggle={() => toggle(groupKey)}
            onSelect={() => go(group.id ? `grup=${group.id}` : 'grup=yok')}
          >
            {groupProducts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    go(group.id ? `grup=${group.id}&urun=${p.id}` : `urun=${p.id}`)
                  }
                  title={p.code}
                  className={`w-full truncate rounded px-1.5 py-1 text-left text-xs transition-colors ${
                    activeProduct === p.id
                      ? 'bg-slate-700/80 font-bold text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </TreeBranch>
        );
      })}
    </ul>
  );
}
