import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCreateReturn } from '../api/useServiceMutations';
import { RETURNABLE_STATUSES, useServiceOrders, type ServiceOrder } from '../api/useServiceOrders';
import { clampReturnQty, toReturnLines, validateReturnDraft } from '../domain/returnDraft';
import { ServiceOrderPicker } from './ServiceOrderPicker';
import { ReturnItemPicker } from './ReturnItemPicker';

interface Props {
  myOrgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** İki adımlı yeni iade talebi penceresi — YALNIZ KABUK, mantık api/domain'de. */
export function ReturnCreationModal({ myOrgId, onClose, onSuccess }: Props) {
  const orders = useServiceOrders(myOrgId, RETURNABLE_STATUSES);
  const createReturn = useCreateReturn();

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const title = order ? 'İade Detaylarını Girin' : 'Yeni İade Talebi Başlat';

  const submit = () => {
    if (!order) return;

    const lines = toReturnLines(quantities);
    const invalid = validateReturnDraft(lines, reason);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    createReturn.mutate(
      { orderId: order.id, items: lines, reason: reason.trim() },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'İade talebi oluşturulurken bir hata oluştu.'),
      },
    );
  };

  return (
    <Modal
      label={title}
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-left"
      onClose={onClose}
      closeDisabled={createReturn.isPending}
    >
      <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-red-50 to-pink-50/60 flex-shrink-0">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-1.5 rounded-full bg-red-500" />
            <div className={`w-8 h-1.5 rounded-full transition-all ${order ? 'bg-red-500' : 'bg-slate-200'}`} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {error && (
          <p role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            ⚠️ {error}
          </p>
        )}

        {!order ? (
          <ServiceOrderPicker
            orders={orders.data ?? []}
            loading={orders.isPending}
            accent="rose"
            showQuota={false}
            listLabel="Teslim Edilmiş Siparişleriniz"
            emptyText="Teslim edilmiş ve iade edilebilir sipariş bulunamadı."
            onSelect={(o) => {
              setOrder(o);
              setQuantities({});
              setError(null);
            }}
          />
        ) : (
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-800">Sipariş: #{order.orderNo}</span>
                <span className="text-slate-400 ml-2">({order.manufacturerName})</span>
              </div>
              <button
                type="button"
                onClick={() => setOrder(null)}
                className="text-red-600 hover:underline font-bold text-[11px] cursor-pointer"
              >
                ← Değiştir
              </button>
            </div>

            <ReturnItemPicker
              items={order.items}
              quantities={quantities}
              onChange={(id, value, max) =>
                setQuantities((prev) => ({ ...prev, [id]: clampReturnQty(value, max) }))
              }
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                İade Nedeni <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Lütfen iade talebinizin nedenini detaylıca açıklayınız..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-slate-50 flex justify-end gap-2.5 flex-shrink-0">
        <Button variant="secondary" onClick={onClose} disabled={createReturn.isPending}>
          İptal
        </Button>
        {order && (
          <Button
            loading={createReturn.isPending}
            onClick={submit}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            İade Talebi Gönder
          </Button>
        )}
      </div>
    </Modal>
  );
}
