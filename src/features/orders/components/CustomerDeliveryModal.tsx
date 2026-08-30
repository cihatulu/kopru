import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useOrderDetail } from '../api/useOrderDetail';
import { useScheduleCustomerDelivery } from '../api/useOrderMutations';

interface Props {
  orderId: string;
  orgId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const TIME_SLOTS = [
  { label: '09:00 - 12:00 (Sabah)', value: '09:00 - 12:00' },
  { label: '13:00 - 17:00 (Öğleden Sonra)', value: '13:00 - 17:00' },
  { label: '17:00 - 21:00 (Akşam)', value: '17:00 - 21:00' },
];

export function CustomerDeliveryModal({ orderId, orgId, onClose, onSuccess }: Props) {
  const { data: order, isPending: isLoadingDetail, isError } = useOrderDetail(orderId, orgId);
  const scheduleMutation = useScheduleCustomerDelivery();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Yarının tarihi varsayılan
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0] ?? '';

  const [deliveryDate, setDeliveryDate] = useState(defaultDateStr);
  const [timeSlot, setTimeSlot] = useState('13:00 - 17:00');
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Sipariş detayı yüklendiğinde formu gerçek verilerle doldur
  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setCustomerAddress(order.customerAddress || '');

      if (order.latestDelivery) {
        setDeliveryDate(order.latestDelivery.deliveryDate || defaultDateStr);
        const slot = order.latestDelivery.timeSlot || '13:00 - 17:00';
        if (TIME_SLOTS.some((s) => s.value === slot)) {
          setTimeSlot(slot);
          setCustomTimeSlot('');
        } else {
          setTimeSlot('custom');
          setCustomTimeSlot(slot);
        }
        setNotes(order.latestDelivery.notes || '');
      }

      // Kalem miktarlarını tam adet olarak seçili başlat
      const initialQty: Record<string, number> = {};
      for (const item of order.items) {
        initialQty[item.id] = item.quantity;
      }
      setSelectedQuantities(initialQty);
    }
  }, [order, defaultDateStr]);

  if (isLoadingDetail) {
    return (
      <Modal label="Teslimat Yükleniyor" onClose={onClose} panelClassName="max-w-md w-full rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Spinner />
          <p className="text-sm font-semibold text-slate-700">Sipariş detayları ve ürün kalemleri yükleniyor...</p>
        </div>
      </Modal>
    );
  }

  if (isError || !order) {
    return (
      <Modal label="Hata" onClose={onClose} panelClassName="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl">
        <div className="space-y-4 text-center">
          <p className="text-sm font-bold text-red-600">Sipariş detayları yüklenemedi.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Kapat</Button>
        </div>
      </Modal>
    );
  }

  const items = order.items;
  const activeTimeSlot = customTimeSlot.trim() || timeSlot;

  const totalItemsToDeliver = items.reduce(
    (sum, i) => sum + (selectedQuantities[i.id] ?? 0),
    0,
  );

  const handleQuantityChange = (id: string, qty: number, max: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(qty, max)),
    }));
  };

  const handleSave = async () => {
    if (!deliveryDate) return;

    const deliveryItems = items
      .filter((i) => (selectedQuantities[i.id] ?? 0) > 0)
      .map((i) => ({
        orderItemId: i.id,
        name: i.name,
        quantity: selectedQuantities[i.id] ?? 0,
      }));

    try {
      await scheduleMutation.mutateAsync({
        orderId: order.id,
        deliveryDate,
        timeSlot: activeTimeSlot,
        customerName,
        customerPhone,
        customerAddress,
        notes: notes.trim() || undefined,
        items: deliveryItems,
      });

      onSuccess?.();
      onClose();
    } catch {
      // Hata mutation state'inde gösterilir
    }
  };

  const handleSendWhatsApp = () => {
    if (!customerPhone) return;

    const formattedDate = deliveryDate ? formatDate(deliveryDate) : 'belirlenen tarihte';
    const message = `Merhaba Sayın ${customerName || 'Müşterimiz'},\n\n` +
      `${order.orderNo} numaralı mobilya siparişinizin adresinize teslimat & montaj randevusu planlanmıştır.\n\n` +
      `📅 *Teslimat Tarihi:* ${formattedDate}\n` +
      `⏰ *Saat Aralığı:* ${activeTimeSlot}\n` +
      `📍 *Teslimat Adresi:* ${customerAddress || 'Kayıtlı Adresiniz'}\n` +
      (notes.trim() ? `📝 *Not:* ${notes.trim()}\n\n` : '\n') +
      `Siparişinizi iyi günlerde kullanmanızı dileriz.`;

    const url = buildWhatsAppLink(customerPhone, message);
    window.open(url, '_blank');
  };

  return (
    <Modal
      label="Müşteri Teslimat ve Montaj Planlama"
      panelClassName="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-5"
      onClose={onClose}
      closeDisabled={scheduleMutation.isPending}
    >
      {/* Modal Başlığı */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-lg shadow-sm border border-blue-100">
              🚚
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Nihai Müşteri Teslimat & Montaj Akışı
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sipariş No: <span className="font-mono font-bold text-slate-800">{order.orderNo}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-4 text-left">
        {/* 1. Müşteri & İletişim Bilgileri (Düzenlenebilir) */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3 shadow-inner">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>👤</span> Müşteri & Teslimat Bilgileri
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cust-name">
                Müşteri Adı Soyadı
              </label>
              <input
                id="cust-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cust-phone">
                Müşteri Telefonu
              </label>
              <input
                id="cust-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cust-address">
              Teslimat & Montaj Açık Adresi
            </label>
            <textarea
              id="cust-address"
              rows={2}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="İl, ilçe, mahalle, cadde, bina no, kat/daire bilgileri..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10 leading-relaxed"
            />
          </div>
        </div>

        {/* 2. Sevkiyat & Teslimat Zamanı */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>📅</span> Teslimat Zamanı & Saat Aralığı
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="deliv-date">
                Teslimat Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                id="deliv-date"
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Saat Aralığı
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <select
                  value={TIME_SLOTS.some((s) => s.value === timeSlot) ? timeSlot : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setTimeSlot('custom');
                    } else {
                      setTimeSlot(e.target.value);
                      setCustomTimeSlot('');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                  <option value="custom">Özel Saat Aralığı Gir...</option>
                </select>

                {(timeSlot === 'custom' || customTimeSlot) && (
                  <input
                    type="text"
                    value={customTimeSlot}
                    onChange={(e) => setCustomTimeSlot(e.target.value)}
                    placeholder="Örn: 11:30 - 14:00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10 mt-1"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Teslim Edilecek Kalemler (Gerçek Sipariş Ürünleri) */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>📦</span> Teslim Edilecek Ürünler ({totalItemsToDeliver} Adet)
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSelectedQuantities(
                    Object.fromEntries(items.map((i) => [i.id, i.quantity])),
                  )
                }
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Tümünü Seç
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {items.map((item) => {
                const qty = selectedQuantities[item.id] ?? 0;
                const isSelected = qty > 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 text-xs transition-colors ${
                      isSelected ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                      {item.code && (
                        <p className="text-[11px] font-mono text-slate-400">{item.code}</p>
                      )}
                      {item.customDescription && (
                        <p className="text-[10px] font-semibold text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-0.5 border border-amber-200/60">
                          Özel Talep: {item.customDescription}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sipariş Adedi: <span className="font-bold text-slate-800">{item.quantity} Adet</span>
                      </p>
                    </div>

                    {/* Adet Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => handleQuantityChange(item.id, qty - 1, item.quantity)}
                        className="size-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold cursor-pointer select-none"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold text-sm font-mono">{qty}</span>
                      <button
                        type="button"
                        disabled={qty >= item.quantity}
                        onClick={() => handleQuantityChange(item.id, qty + 1, item.quantity)}
                        className="size-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Montaj & Sevkiyat Ekibine Not */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="deliv-notes">
            Montaj & Teslimat Notu (Opsiyonel)
          </label>
          <input
            id="deliv-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Örn: 3. Kat asansörsüz, montaj yapılacak, bina önü park uygun..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10"
          />
        </div>

        {scheduleMutation.isError && (
          <p role="alert" className="text-xs font-bold text-red-600">
            {scheduleMutation.error instanceof Error
              ? scheduleMutation.error.message
              : 'Teslimat planlaması kaydedilemedi.'}
          </p>
        )}
      </div>

      {/* Modal Aksiyon Butonları */}
      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {customerPhone ? (
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer select-none shadow-xs"
          >
            <span>💬</span>
            <span>WhatsApp Randevu Bildirimi</span>
          </button>
        ) : (
          <div />
        )}

        <div className="w-full sm:w-auto flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={scheduleMutation.isPending}
            className="w-full sm:w-auto justify-center"
          >
            İptal
          </Button>

          <button
            type="button"
            disabled={!deliveryDate || totalItemsToDeliver <= 0 || scheduleMutation.isPending}
            onClick={() => void handleSave()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172b] hover:bg-[#1a2645] active:bg-[#090f1d] text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
          >
            {scheduleMutation.isPending ? 'Kaydediliyor...' : '🚚 Teslimatı Planla & Başlat'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
