import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ProductGroup } from '../api/useProductGroups';

interface Props {
  groups: ProductGroup[];
  pending: boolean;
  onSave: (input: { id?: string; name: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Ürün grupları — katalogda başlık görevi görür. */
export function GroupManager({ groups, pending, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<ProductGroup | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(editing ? { id: editing.id, name: trimmed } : { name: trimmed });
    setName('');
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ürün grupları"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Ürün grupları</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gruplar katalogda başlık olur. Grup silinince içindeki ürünler silinmez, yalnız
          gruptan çıkar.
        </p>

        <div className="mt-5 flex gap-2">
          <input
            className="input"
            placeholder={editing ? 'Yeni adı' : 'Grup adı'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Grup adı"
          />
          <Button loading={pending} onClick={submit}>
            {editing ? 'Güncelle' : 'Ekle'}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setName('');
              }}
            >
              Vazgeç
            </Button>
          )}
        </div>

        {groups.length === 0 ? (
          <p className="mt-5 text-sm text-slate-400">Henüz grup oluşturulmadı.</p>
        ) : (
          <ul className="mt-5 space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="truncate text-sm text-slate-900">{g.name}</span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(g);
                      setName(g.name);
                    }}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(g.id)}
                    className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Sil
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
