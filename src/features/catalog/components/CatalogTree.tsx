import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { TREE_LABELS, useCatalogTree } from '../api/useCatalogTree';
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
  const [open, setOpen] = useState<Set<string>>(new Set());

  const activeGroup = params.get('grup');
  const activeCategory = params.get('kategori');
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
    <ul className="mb-1 ml-3 space-y-0.5 border-l border-slate-700/60 pl-2">
      {tree.data.map((group) => {
        const groupKey = group.id ?? 'grupsuz';
        // Aktif grup kendiliğinden açılır: kullanıcı ona tıkladıysa içeriğini
        // görmek istiyor demektir.
        const groupOpen = open.has(groupKey) || activeGroup === group.id;

        return (
          <TreeBranch
            key={groupKey}
            label={group.name}
            emphasis
            expanded={groupOpen}
            active={activeGroup === group.id}
            onToggle={() => toggle(groupKey)}
            onSelect={() => go(group.id ? `grup=${group.id}` : 'grup=yok')}
          >
            {group.categories.map((category) => {
              const catKey = `${groupKey}:${category.name ?? 'kategorisiz'}`;
              const catOpen = open.has(catKey) || activeCategory === category.name;

              return (
                <TreeBranch
                  key={catKey}
                  label={category.name ?? TREE_LABELS.uncategorized}
                  expanded={catOpen}
                  active={activeCategory === category.name}
                  onToggle={() => toggle(catKey)}
                  onSelect={() =>
                    go(
                      category.name
                        ? `kategori=${encodeURIComponent(category.name)}`
                        : 'kategori=yok',
                    )
                  }
                >
                  {category.products.map((p) => (
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
                </TreeBranch>
              );
            })}
          </TreeBranch>
        );
      })}
    </ul>
  );
}
