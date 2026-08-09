import { Button } from '@/components/ui/Button';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  onOpenGroups: () => void;
  onCreate: () => void;
}

export function ProductToolbar({ search, onSearchChange, onOpenGroups, onCreate }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ürün Yönetimi</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Satış fiyatını müşterileriniz görür. Maliyetiniz ayrı tutulur ve hiçbir perakendeciye
            gösterilmez.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onOpenGroups}>
            Gruplar
          </Button>
          <Button onClick={onCreate}>Yeni ürün</Button>
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Ürün adı veya kodu"
        aria-label="Ürün ara"
        className="input max-w-xs"
      />
    </div>
  );
}
