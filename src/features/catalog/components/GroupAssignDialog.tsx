import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ProductGroup } from '../api/useProductGroups';

interface Props {
  groups: ProductGroup[];
  selectedCount: number;
  pending: boolean;
  onClose: () => void;
  /** Yeni grup adı VEYA mevcut grup id'si — ikisi birden değil. */
  onSave: (choice: { newName?: string; groupId?: string }) => void;
}

/** "Gruba Ekle" — seçili ürünleri yeni veya mevcut bir gruba koyar. */
export function GroupAssignDialog({ groups, selectedCount, pending, onClose, onSave }: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>(groups.length > 0 ? 'existing' : 'new');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');

  const valid = mode === 'new' ? name.trim().length >= 2 : groupId !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seçilenleri gruba ekle"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-extrabold text-slate-800">Seçilenleri Gruba Ekle</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {selectedCount} ürün seçtiniz. Bu ürünleri nasıl gruplamak istersiniz?
        </p>

        <div className="mt-5 space-y-4">
          <Option active={mode === 'new'} label="Yeni Grup Oluştur" onSelect={() => setMode('new')}>
            <input
              type="text"
              className="input mt-3"
              placeholder="Grup adı (örn. Köşe Koltuk Takımı)"
              value={name}
              disabled={mode !== 'new'}
              onChange={(e) => setName(e.target.value)}
            />
          </Option>

          <Option
            active={mode === 'existing'}
            label="Mevcut Gruba Ekle"
            onSelect={() => groups.length > 0 && setMode('existing')}
          >
            <select
              className="input mt-3"
              value={groupId}
              disabled={mode !== 'existing' || groups.length === 0}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Bir grup seçiniz…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="mt-2 text-xs font-bold text-slate-500">
                Henüz hiç grup oluşturulmamış.
              </p>
            )}
          </Option>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            İptal
          </Button>
          <Button
            loading={pending}
            disabled={!valid}
            onClick={() =>
              onSave(mode === 'new' ? { newName: name.trim() } : { groupId })
            }
          >
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

function Option({
  active,
  label,
  onSelect,
  children,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
        active ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <input type="radio" checked={active} readOnly className="size-4 text-indigo-600" />
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
      {children}
    </div>
  );
}
