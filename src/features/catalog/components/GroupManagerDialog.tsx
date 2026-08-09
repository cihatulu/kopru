import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { ProductGroup } from '../api/useProductGroups';
import type { CatalogProduct } from '../api/useProducts';
import { GroupEditor } from './GroupEditor';

interface Props {
  groups: ProductGroup[];
  products: CatalogProduct[];
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetMembers: (groupId: string, productIds: string[]) => void;
}

/** "Grupları Yönet" — liste, yeni grup, düzenleme ve silme tek pencerede. */
export function GroupManagerDialog(props: Props) {
  const { groups, products, pending, onClose, onCreate } = props;
  const [editing, setEditing] = useState<ProductGroup | null>(null);
  const [newName, setNewName] = useState('');

  const countIn = (groupId: string) => products.filter((p) => p.groupId === groupId).length;

  if (editing) {
    return (
      <GroupEditor
        group={editing}
        products={products}
        pending={pending}
        onBack={() => setEditing(null)}
        onRename={props.onRename}
        onDelete={(id) => {
          props.onDelete(id);
          setEditing(null);
        }}
        onSetMembers={props.onSetMembers}
      />
    );
  }

  return (
    <Modal
      label={'Ürün gruplarını yönet'}
      panelClassName={
        'flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-extrabold text-slate-800">Ürün Gruplarını Yönet</h2>
      <p className="mt-1 text-sm text-slate-500">
        Grup bir etikettir: grubu silmek ürünleri silmez, yalnız etiketi kaldırır.
      </p>

      <div className="mt-5 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Yeni grup adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          loading={pending}
          disabled={newName.trim().length < 2}
          onClick={() => {
            onCreate(newName.trim());
            setNewName('');
          }}
        >
          Ekle
        </Button>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {groups.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Henüz grup yok.</p>
        )}
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-bold text-slate-800">{g.name}</p>
              <p className="text-xs text-slate-400">{countIn(g.id)} ürün</p>
            </div>
            <Button variant="secondary" onClick={() => setEditing(g)}>
              Düzenle
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
        <Button variant="secondary" onClick={onClose}>
          Kapat
        </Button>
      </div>
    </Modal>
  );
}
