import { Button } from '@/components/ui/Button';

interface Props {
  exportDisabled: boolean;
  onExport: () => void;
  onImport: () => void;
}

/** Stok sayfası başlığı ve şablon indir / dosya yükle eylemleri. */
export function StockHeader({ exportDisabled, onExport, onImport }: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stok Yönetimi</h1>
        <p className="mt-1 text-xs text-slate-500">
          Ürün stoklarınızı tek tek veya Excel şablonu ile toplu güncelleyin.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" size="sm" disabled={exportDisabled} onClick={onExport}>
          Şablon İndir
        </Button>
        <Button size="sm" onClick={onImport}>
          Dosya Yükle
        </Button>
      </div>
    </div>
  );
}
