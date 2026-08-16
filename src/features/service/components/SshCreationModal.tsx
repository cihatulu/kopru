import { useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCounterparties, type Edge } from '@/features/counterparties';
import { useSshCreation } from '../api/useSshCreation';
import { useServiceOrders } from '../api/useServiceOrders';
import { ServiceOrderPicker } from './ServiceOrderPicker';
import { SshDetailStep } from './SshDetailStep';

interface Props {
  myOrgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** İki adımlı yeni SSH talebi penceresi — YALNIZ KABUK, mantık api/domain'de. */
export function SshCreationModal({ myOrgId, onClose, onSuccess }: Props) {
  const counterparties = useCounterparties();
  const edges: Edge[] = useMemo(
    () => (counterparties.data?.pages.flat() ?? []).filter((e) => e.status === 'active'),
    [counterparties.data],
  );

  const orders = useServiceOrders(myOrgId);
  const form = useSshCreation(edges[0]?.id ?? '', () => {
    onClose();
    onSuccess();
  });

  const title = form.step === 1 ? 'Yeni SSH Talebi Başlat' : 'SSH Talebi Detayları';

  return (
    <Modal
      label={title}
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left"
      onClose={onClose}
      closeDisabled={form.submitting}
    >
      <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50/60 flex-shrink-0">
        <div>
          <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-1.5 rounded-full bg-brand-600" />
            <div
              className={`w-8 h-1.5 rounded-full transition-all ${
                form.step >= 2 ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            />
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

      <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
        {form.error && (
          <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
            ⚠️ {form.error}
          </p>
        )}

        {form.step === 1 ? (
          <ServiceOrderPicker
            orders={orders.data ?? []}
            loading={orders.isPending}
            accent="blue"
            showQuota
            listLabel="Siparişleriniz"
            emptyText="Sipariş bulunamadı."
            onSelect={form.selectOrder}
            manual={{ label: '+ Siparişsiz Manuel Talep Oluştur', onSelect: form.selectManual }}
          />
        ) : (
          <SshDetailStep form={form} edges={edges} myOrgId={myOrgId} />
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 flex-shrink-0">
        <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
          İptal
        </Button>
        {form.step === 2 && (
          <Button
            loading={form.submitting}
            onClick={() => void form.submit()}
            
          >
            Talebi Gönder
          </Button>
        )}
      </div>
    </Modal>
  );
}
