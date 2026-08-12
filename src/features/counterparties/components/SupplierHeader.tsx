import { Button } from '@/components/ui/Button';

interface Props {
  onInvite: () => void;
  onAdd: () => void;
}

/** Üretici Yönetimi başlığı ve iki birincil eylemi. */
export function SupplierHeader({ onInvite, onAdd }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Üretici Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistemde kayıtlı veya davet ettiğiniz üreticileri yönetin.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onInvite}
          className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
        >
          Davet Gönder
        </Button>
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
        >
          + Yeni Üretici Ekle
        </Button>
      </div>
    </div>
  );
}
