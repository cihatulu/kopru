import { Button } from './Button';

interface Props {
  /** "Toplam 42 ürün listeleniyor" gibi sayaç metni. */
  label: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

/** Liste altlığı: sayaç + keyset sayfalamanın "daha fazla" düğmesi. */
export function ListFooter({ label, hasMore, loading, onLoadMore }: Props) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {hasMore && (
        <Button variant="secondary" loading={loading} onClick={onLoadMore}>
          Daha fazla yükle
        </Button>
      )}
    </div>
  );
}
