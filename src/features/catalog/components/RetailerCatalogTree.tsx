import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useCounterparties, type Edge } from '@/features/counterparties';
import { useCatalogTree } from '../api/useCatalogTree';
import { TreeBranch } from './TreeBranch';

function ManufacturerBranch({
  edge,
  activeManufacturerId,
  activeGroupId,
  activeProductId,
  onNavigate,
}: {
  edge: Edge;
  activeManufacturerId: string | null;
  activeGroupId: string | null;
  activeProductId: string | null;
  onNavigate: (query: string) => void;
}) {
  const mId = edge.manufacturerOrgId;
  const isCurrentM = activeManufacturerId === mId;
  const [open, setOpen] = useState<Set<string>>(new Set());

  const tree = useCatalogTree(mId);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const mOpen = open.has(mId) || isCurrentM;

  return (
    <TreeBranch
      label={edge.manufacturer.companyName}
      emphasis
      expanded={mOpen}
      active={isCurrentM && !activeGroupId}
      onToggle={() => toggle(mId)}
      onSelect={() => onNavigate(`manufacturerId=${mId}`)}
    >
      {tree.data?.map((group) => {
        const groupKey = `${mId}:${group.id ?? 'grupsuz'}`;
        const groupOpen = open.has(groupKey) || (isCurrentM && activeGroupId === group.id);
        const groupProducts = group.categories
          .flatMap((c) => c.products)
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

        return (
          <TreeBranch
            key={groupKey}
            label={group.name}
            emphasis
            expanded={groupOpen}
            active={isCurrentM && activeGroupId === group.id && !activeProductId}
            onToggle={() => toggle(groupKey)}
            onSelect={() =>
              onNavigate(
                `manufacturerId=${mId}&groupId=${group.id ?? 'yok'}`,
              )
            }
          >
            {groupProducts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      `manufacturerId=${mId}&groupId=${group.id ?? 'yok'}&productId=${p.id}`,
                    )
                  }
                  title={p.code}
                  className={`w-full truncate rounded px-1.5 py-1 text-left text-xs transition-colors ${
                    isCurrentM && activeProductId === p.id
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
    </TreeBranch>
  );
}

export function RetailerCatalogTree() {
  const suppliers = useCounterparties();
  const edges: Edge[] = (suppliers.data?.pages.flat() ?? []).filter((e) => e.status === 'active');

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();

  const activeManufacturerId = params.get('manufacturerId') ?? params.get('uretici');
  const activeGroupId = params.get('groupId') ?? params.get('grup');
  const activeProductId = params.get('productId') ?? params.get('urun');

  if (edges.length === 0) return null;

  const go = (query: string): void => {
    void navigate(`${ROUTES.retailer}/katalog?${query}`);
  };

  return (
    <ul key={location.pathname} className="mb-1 ml-3 space-y-1 border-l border-slate-700/60 pl-2">
      {edges.map((edge) => (
        <ManufacturerBranch
          key={edge.id}
          edge={edge}
          activeManufacturerId={activeManufacturerId}
          activeGroupId={activeGroupId}
          activeProductId={activeProductId}
          onNavigate={go}
        />
      ))}
    </ul>
  );
}
