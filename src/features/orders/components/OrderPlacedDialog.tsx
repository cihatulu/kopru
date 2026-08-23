import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { openHtmlPrintWindow } from '@/lib/print';
import { buildOrderTrackingMessage } from '../domain/orderShare';
import { buildOrderPrintHtml, type PrintableOrder } from '../domain/printOrder';

const ACTION = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer';
const SECONDARY = `${ACTION} border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300`;

interface Props {
  orderToken: string;
  customerName: string | null;
  /** Boşsa WhatsApp düğmesi PASİF olur — numarasız link kimseye ulaşmaz. */
  customerPhone: string | null;
  printData: PrintableOrder;
  onClose: () => void;
  onGoToOrders: () => void;
}

/** Sipariş sonrası başarı penceresi: takip linki, WhatsApp paylaşımı ve yazdırma (Impeccable Delight). */
export function OrderPlacedDialog({
  orderToken,
  customerName,
  customerPhone,
  printData,
  onClose,
  onGoToOrders,
}: Props) {
  const [copied, setCopied] = useState(false);
  const phone = customerPhone?.trim() ?? '';
  const trackingUrl = `${window.location.origin}/takip/${orderToken}`;
  const waLink = buildWhatsAppLink({
    phone,
    message: buildOrderTrackingMessage({
      origin: window.location.origin,
      orderToken,
      customerName: customerName ?? undefined,
    }),
  });

  const handleCopy = () => {
    void navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal label="Sipariş Başarıyla Oluşturuldu" onClose={onClose}>
      <div className="space-y-4 text-center">
        {/* Celebration Icon */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm animate-in zoom-in duration-300">
          <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">Sipariş Başarıyla Oluşturuldu!</h3>
          <p className="font-mono text-xs font-bold text-slate-500 mt-1">
            Sipariş No: <span className="text-slate-900 font-extrabold">{printData.orderNo}</span>
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Sipariş sisteme işlendi. Müşterinize canlı sipariş takip linkini gönderebilir veya formu yazdırabilirsiniz.
        </p>

        {/* Tracking Link Copy Box */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Canlı Takip Bağlantısı</span>
            <p className="text-xs font-mono font-bold text-slate-700 truncate">{trackingUrl}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            {copied ? 'Kopyalandı! ✓' : 'Kopyala'}
          </button>
        </div>

        {!phone && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 font-medium text-left">
            ℹ️ Müşteri telefon numarası girilmediği için WhatsApp ile doğrudan gönderim devre dışıdır.
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {phone ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ACTION} bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md`}
            >
              <span>💬</span>
              <span>WhatsApp ile Gönder</span>
            </a>
          ) : (
            <span
              aria-disabled="true"
              className={`${ACTION} bg-emerald-600/40 text-white cursor-not-allowed select-none`}
            >
              <span>💬</span>
              <span>WhatsApp ile Gönder</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => openHtmlPrintWindow(buildOrderPrintHtml(printData))}
            className={SECONDARY}
          >
            <span>🖨️</span>
            <span>Yazdır</span>
          </button>

          <button type="button" onClick={onGoToOrders} className={SECONDARY}>
            <span>📦</span>
            <span>Siparişlerime Git</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
