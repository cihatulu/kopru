import { otherParty, type Edge } from '@/features/counterparties';
import { SshItemPicker } from './SshItemPicker';
import { SshPhotoPicker } from './SshPhotoPicker';
import type { useSshCreation } from '../api/useSshCreation';

const LABEL = 'block text-[11px] font-extrabold uppercase tracking-wider text-slate-500';
const INPUT =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none';

interface Props {
  form: ReturnType<typeof useSshCreation>;
  edges: Edge[];
  myOrgId: string;
}

/** Adım 2 — ürün, açıklama, fotoğraf ve müşteri bilgileri. */
export function SshDetailStep({ form, edges, myOrgId }: Props) {
  const { order, fields, setField } = form;

  return (
    <div className="space-y-5">
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
        <div>
          {order ? (
            <>
              <span className="font-bold text-slate-800">Sipariş: #{order.orderNo}</span>
              <span className="text-slate-400 ml-2">({order.manufacturerName})</span>
            </>
          ) : (
            <span className="font-bold text-slate-800">Genel / Siparişsiz SSH Talebi</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => form.setStep(1)}
          className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
        >
          ← Değiştir
        </button>
      </div>

      {/* Sipariş seçilmediyse ilişki elle seçilir: talep bir ilişkiye yazılır (A9). */}
      {!order && edges.length > 0 && (
        <div className="space-y-1.5">
          <label className={LABEL}>
            TEDARİKÇİ FİRMA <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.relId}
            onChange={(e) => form.setRelId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none cursor-pointer"
          >
            {edges.map((e) => (
              <option key={e.id} value={e.id}>
                {otherParty(e, myOrgId).companyName}
              </option>
            ))}
          </select>
        </div>
      )}

      <SshItemPicker
        items={form.items}
        customProductName={fields.customProductName}
        onToggle={(id) =>
          form.setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)),
          )
        }
        onQtyChange={(id, delta) =>
          form.setItems((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, qty: Math.max(1, Math.min(i.maxQty, i.qty + delta)) } : i,
            ),
          )
        }
        onCustomNameChange={(v) => setField('customProductName', v)}
      />

      <div className="space-y-1.5">
        <label className={LABEL}>
          AÇIKLAMA / SORUN DETAYI <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          placeholder="Lütfen sorunu detaylı olarak açıklayınız..."
          value={fields.description}
          onChange={(e) => setField('description', e.target.value)}
          className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
        />
      </div>

      <SshPhotoPicker files={form.files} onAdd={form.addFiles} onRemove={form.removeFile} />

      <div className="space-y-2 pt-1 border-t border-slate-100">
        <label className={LABEL}>SON KULLANICI / MÜŞTERİ BİLGİLERİ (İSTEĞE BAĞLI)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Müşteri Ad Soyad"
            value={fields.customerName}
            onChange={(e) => setField('customerName', e.target.value)}
            className={INPUT}
          />
          <input
            type="text"
            placeholder="Telefon (05XX...)"
            value={fields.customerPhone}
            onChange={(e) => setField('customerPhone', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
    </div>
  );
}
