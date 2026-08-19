import { Modal } from '@/components/ui/Modal';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { openHtmlPrintWindow } from '@/lib/print';
import { buildOrderTrackingMessage } from '../domain/orderShare';
import { buildOrderPrintHtml, type PrintableOrder } from '../domain/printOrder';

const ACTION = 'rounded-lg px-4 py-2.5 text-xs font-bold transition-colors';
const SECONDARY = `${ACTION} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer`;

interface Props {
  orderToken: string;
  customerName: string | null;
  /** Boşsa WhatsApp düğmesi PASİF olur — numarasız link kimseye ulaşmaz. */
  customerPhone: string | null;
  printData: PrintableOrder;
  onClose: () => void;
  onGoToOrders: () => void;
}

/** Sipariş sonrası pencere: takip linkini gönder, formu yazdır ya da listeye git. */
export function OrderPlacedDialog({
  orderToken,
  customerName,
  customerPhone,
  printData,
  onClose,
  onGoToOrders,
}: Props) {
  const phone = customerPhone?.trim() ?? '';
  const waLink = buildWhatsAppLink({
    phone,
    message: buildOrderTrackingMessage({
      origin: window.location.origin,
      orderToken,
      customerName: customerName ?? undefined,
    }),
  });

  return (
    <Modal label="Sipariş Başarıyla Oluşturuldu" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900">Sipariş Başarıyla Oluşturuldu</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Sipariş başarıyla kaydedildi. Müşteriye WhatsApp üzerinden takip bağlantısını
          gönderebilirsiniz.
        </p>

        {!phone && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Müşterinize, takip linki gönderebilmeniz için platform üyesi olmanız gerekmektedir.
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-1">
          {phone ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ACTION} bg-green-600 text-white hover:bg-green-700`}
            >
              WhatsApp ile Gönder
            </a>
          ) : (
            <span
              aria-disabled="true"
              className={`${ACTION} bg-green-600/40 text-white cursor-not-allowed select-none`}
            >
              WhatsApp ile Gönder
            </span>
          )}

          <button
            type="button"
            onClick={() => openHtmlPrintWindow(buildOrderPrintHtml(printData))}
            className={SECONDARY}
          >
            Yazdır
          </button>

          <button type="button" onClick={onGoToOrders} className={SECONDARY}>
            Siparişlerime Git
          </button>
        </div>
      </div>
    </Modal>
  );
}

