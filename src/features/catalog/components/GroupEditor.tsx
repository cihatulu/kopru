import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ProductGroup } from '../api/useProductGroups';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  group: ProductGroup;
  products: CatalogProduct[];
  pending: boolean;
  onBack: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetMembers: (groupId: string, productIds: string[]) => void;
}

/**
 * Grup düzenleme: ad değiştirme, üyelik ve silme.
 *
 * Üyelik TEK seferde kaydedilir (sunucu listeyi eşitler): "önce çıkar, sonra
 * ekle" iki ayrı çağrı olsaydı arada bir hata olduğunda grup yarı boş kalırdı.
 */
export function GroupEditor({
  group,
  products,
  pending,
  onBack,
  onRename,
  onDelete,
  onSetMembers,
}: Props) {
  const [name, setName] = useState(group.name);
  const [members, setMembers] = useState<Set<string>>(
    () => new Set(products.filter((p) => p.groupId === group.id).map((p) => p.id)),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = (id: string) => {
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    if (name.trim() !== group.name) onRename(group.id, name.trim());
    onSetMembers(group.id, [...members]);
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Grubu düzenle: ${group.name}`}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-extrabold text-slate-800">Grubu Düzenle</h2>

        <label className="mt-5 block">
          <span className="label">Grup adı</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Gruptaki ürünler ({members.size})
          </h3>
          <span className="text-xs text-slate-400">{products.length} ürün arasından seçin</span>
        </div>

        <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2">
          {products.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Henüz ürün yok.</p>
          )}
          {products.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white"
            >
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={members.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span className="flex-1 truncate text-sm text-slate-700">{p.name}</span>
              <span className="font-mono text-xs text-slate-400">{p.code}</span>
              {p.groupId && p.groupId !== group.id && (
                // Başka bir grupta olan ürünü işaretlemek onu BURAYA taşır;
                // kullanıcı bunu kaydetmeden önce bilmeli.
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  başka grupta
                </span>
              )}
            </label>
          ))}
        </div>

        {confirmDelete ? (
          <div className="mt-5 rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200">
            <p className="text-sm text-red-800">
              <strong>{group.name}</strong> grubu silinsin mi? Ürünler silinmez, yalnız gruptan
              çıkar.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Vazgeç
              </Button>
              <Button loading={pending} onClick={() => onDelete(group.id)}>
                Evet, sil
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Grubu sil
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onBack} disabled={pending}>
                Geri
              </Button>
              <Button loading={pending} disabled={name.trim().length < 2} onClick={save}>
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
