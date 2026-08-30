import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useOrderDetail } from '../api/useOrderDetail';
import {
  useScheduleCustomerDelivery,
  useCancelCustomerDelivery,
  useUpdateCustomerDelivery,
} from '../api/useOrderMutations';

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
  const cancelMutation = useCancelCustomerDelivery();
  const updateMutation = useUpdateCustomerDelivery();

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
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    date: string;
    timeSlot: string;
  } | null>(null);

  // Plan düzenleme ve iptal durumları
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSlot, setEditSlot] = useState('13:00 - 17:00');
  const [editNotes, setEditNotes] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

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

      // Kalem miktarlarını teslim edilebilir kalan adet olarak başlat
      const initialQty: Record<string, number> = {};
      for (const item of order.items) {
        const availableQty = item.remainingDeliveryQty !== undefined
          ? item.remainingDeliveryQty
          : Math.max(0, item.quantity - (item.returnedQty ?? 0) - (item.plannedQty ?? 0));
        initialQty[item.id] = availableQty;
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

      const itemDescriptions = deliveryItems
        .map((i) => `${i.quantity} Adet ${i.name}`)
        .join(', ');

      const successMsg = `${itemDescriptions} sevkiyatı planlandı, müşteri ile mutabık kalındı.`;

      setSuccessInfo({
        message: successMsg,
        date: deliveryDate,
        timeSlot: activeTimeSlot,
      });
    } catch (err) {
      console.error('Teslimat planlama hatası:', err);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customerPhone) return;

    const formattedDate = deliveryDate ? formatDate(deliveryDate) : 'belirlenen tarihte';
    const trackingUrl = order.orderToken ? `${window.location.origin}/takip/${order.orderToken}` : '';

    const selectedDeliveryItems = items
      .filter((i) => (selectedQuantities[i.id] ?? 0) > 0)
      .map((i) => `• ${selectedQuantities[i.id]} Adet ${i.name}`);

    const itemsText = selectedDeliveryItems.length > 0
      ? `📦 *Teslim Edilecek Ürünler:*\n${selectedDeliveryItems.join('\n')}\n\n`
      : '';

    const message = `Merhaba Sayın ${customerName || 'Müşterimiz'},\n\n` +
      `${order.orderNo} numaralı mobilya siparişinizin adresinize teslimat & montaj randevusu planlanmıştır.\n\n` +
      `📅 *Teslimat Tarihi:* ${formattedDate}\n` +
      `⏰ *Saat Aralığı:* ${activeTimeSlot}\n` +
      `📍 *Teslimat Adresi:* ${customerAddress || 'Kayıtlı Adresiniz'}\n\n` +
      itemsText +
      (notes.trim() ? `📝 *Not:* ${notes.trim()}\n\n` : '') +
      (trackingUrl ? `🔗 *Sipariş Takip Linkiniz:*\n${trackingUrl}\n\n` : '') +
      `Siparişinizi iyi günlerde kullanmanızı dileriz.`;

    const url = buildWhatsAppLink({ phone: customerPhone, message });
    window.open(url, '_blank');
  };

  const handleCancelDelivery = async (deliveryId: string) => {
    try {
      await cancelMutation.mutateAsync({ deliveryId });
      setCancelConfirmId(null);
    } catch (err) {
      console.error('Plan iptal hatası:', err);
    }
  };

  const handleStartEdit = (d: { id: string; delivery_date: string; time_slot: string; notes?: string | null }) => {
    setEditingDeliveryId(d.id);
    setEditDate(d.delivery_date);
    setEditSlot(d.time_slot || '13:00 - 17:00');
    setEditNotes(d.notes || '');
  };

  const handleSaveEdit = async (deliveryId: string) => {
    try {
      await updateMutation.mutateAsync({
        deliveryId,
        deliveryDate: editDate,
        timeSlot: editSlot,
        notes: editNotes.trim() || undefined,
      });
      setEditingDeliveryId(null);
    } catch (err) {
      console.error('Plan güncelleme hatası:', err);
    }
  };

  const handleSendPlanWhatsApp = (plan: {
    delivery_date: string;
    time_slot: string;
    notes?: string | null;
    items?: Array<{ order_item_id?: string; name: string; quantity: number }>;
  }) => {
    if (!customerPhone) return;
    const formattedDate = plan.delivery_date ? formatDate(plan.delivery_date) : 'belirlenen tarihte';
    const trackingUrl = order.orderToken ? `${window.location.origin}/takip/${order.orderToken}` : '';

    const planItemsText = Array.isArray(plan.items) && plan.items.length > 0
      ? `📦 *Teslim Edilecek Ürünler:*\n${plan.items.map((i) => `• ${i.quantity} Adet ${i.name}`).join('\n')}\n\n`
      : '';

    const message = `Merhaba Sayın ${customerName || 'Müşterimiz'},\n\n` +
      `${order.orderNo} numaralı mobilya siparişinizin adresinize teslimat & montaj randevusu güncellenmiştir.\n\n` +
      `📅 *Teslimat Tarihi:* ${formattedDate}\n` +
      `⏰ *Saat Aralığı:* ${plan.time_slot}\n` +
      `📍 *Teslimat Adresi:* ${customerAddress || 'Kayıtlı Adresiniz'}\n\n` +
      planItemsText +
      (plan.notes?.trim() ? `📝 *Not:* ${plan.notes.trim()}\n\n` : '') +
      (trackingUrl ? `🔗 *Sipariş Takip Linkiniz:*\n${trackingUrl}\n\n` : '') +
      `Siparişinizi iyi günlerde kullanmanızı dileriz.`;

    const url = buildWhatsAppLink({ phone: customerPhone, message });
    window.open(url, '_blank');
  };

  if (successInfo) {
    return (
      <Modal
        label="Teslimat Planlandı"
        panelClassName="max-w-lg w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-center"
        onClose={() => {
          onSuccess?.();
          onClose();
        }}
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl shadow-sm border border-emerald-200">
          ✓
        </div>

        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            Sevkiyat & Montaj Planlandı
          </h2>
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/80 p-4 text-emerald-950 text-sm font-bold leading-relaxed shadow-xs">
            📢 {successInfo.message}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Planlanan Tarih:</span>
            <span className="font-bold text-slate-800">{formatDate(successInfo.date)} ({successInfo.timeSlot})</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Müşteri:</span>
              <span className="font-semibold text-slate-800">{customerName}</span>
            </div>
          )}
          {customerPhone && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Telefon:</span>
              <span className="font-mono font-semibold text-slate-800">{customerPhone}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {customerPhone && (
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer select-none"
            >
              <span>💬 WhatsApp Bildirimi Gönder</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onSuccess?.();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0f172b] hover:bg-[#1a2645] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </Modal>
    );
  }

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
                <span>📦</span> Teslim Edilecek Ürünler ({totalItemsToDeliver} Adet Seçili)
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSelectedQuantities(
                    Object.fromEntries(
                      items.map((i) => [
                        i.id,
                        i.remainingDeliveryQty !== undefined
                          ? i.remainingDeliveryQty
                          : Math.max(0, i.quantity - (i.returnedQty ?? 0) - (i.plannedQty ?? 0)),
                      ])
                    ),
                  )
                }
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Kalanların Tümünü Seç
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {items.map((item) => {
                const maxQty = item.remainingDeliveryQty !== undefined
                  ? item.remainingDeliveryQty
                  : Math.max(0, item.quantity - (item.returnedQty ?? 0) - (item.plannedQty ?? 0));
                const qty = selectedQuantities[item.id] ?? 0;
                const isSelected = qty > 0;
                const isFullyPlanned = maxQty === 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 text-xs transition-colors ${
                      isFullyPlanned
                        ? 'bg-emerald-50/40 border-l-4 border-emerald-500'
                        : isSelected
                          ? 'bg-white'
                          : 'bg-slate-50/70 text-slate-400'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                        {isFullyPlanned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            ✓ Tamamı Planlandı
                          </span>
                        )}
                      </div>
                      {item.code && (
                        <p className="text-[11px] font-mono text-slate-400">{item.code}</p>
                      )}
                      {item.customDescription && (
                        <p className="text-[10px] font-semibold text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-0.5 border border-amber-200/60">
                          Özel Talep: {item.customDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span>Sipariş: <strong className="text-slate-700">{item.quantity} Adet</strong></span>
                        {(item.plannedQty ?? 0) > 0 && (
                          <span className="text-blue-700 font-semibold">Önceki Plan: {item.plannedQty} Adet</span>
                        )}
                        {(item.returnedQty ?? 0) > 0 && (
                          <span className="text-red-600 font-semibold">İade: {item.returnedQty} Adet</span>
                        )}
                        <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Kalan Teslim Edilebilir: {maxQty} Adet
                        </span>
                      </div>
                    </div>

                    {/* Adet Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {maxQty > 0 ? (
                        <>
                          <button
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => handleQuantityChange(item.id, qty - 1, maxQty)}
                            className="size-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold cursor-pointer select-none"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold text-sm font-mono">{qty}</span>
                          <button
                            type="button"
                            disabled={qty >= maxQty}
                            onClick={() => handleQuantityChange(item.id, qty + 1, maxQty)}
                            className="size-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold cursor-pointer select-none"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2 py-1 rounded-lg">
                          0 / 0
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Aktif / Oluşturulmuş Teslimat Planları (İptal ve Tarih Değiştirme) */}
        {(() => {
          const activeDeliveries = (order.customerDeliveries || []).filter((d) => d.status !== 'cancelled');
          if (activeDeliveries.length === 0) return null;

          return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <span>📋</span> Oluşturulmuş Teslimat Planları ({activeDeliveries.length} Plan)
                </h3>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                  Müşteri Takip Linkinde Aktif
                </span>
              </div>

              <div className="space-y-2.5">
                {activeDeliveries.map((d) => {
                  const isEditing = editingDeliveryId === d.id;
                  const isCancelling = cancelConfirmId === d.id;
                  const planItems = Array.isArray(d.items) ? d.items : [];

                  return (
                    <div
                      key={d.id}
                      className="rounded-xl border border-emerald-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            Plan No: #{d.id.slice(0, 8)}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            📅 {formatDate(d.delivery_date)}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            ({d.time_slot})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {customerPhone && (
                            <button
                              type="button"
                              title="Bu plan için müşteriye WhatsApp bildirimi gönder"
                              onClick={() => handleSendPlanWhatsApp(d)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              💬 WhatsApp
                            </button>
                          )}

                          {!isEditing && (
                            <button
                              type="button"
                              title="Müşteri talebine göre randevu tarih ve saatini güncelle"
                              onClick={() => handleStartEdit(d)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              ✏️ Tarih Değiştir
                            </button>
                          )}

                          {!isCancelling ? (
                            <button
                              type="button"
                              title="Planı iptal et ve ürünleri tekrar teslim edilebilir stoğa al"
                              onClick={() => setCancelConfirmId(d.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              🗑️ Planı İptal Et
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-red-100/90 p-1 rounded-lg border border-red-300">
                              <span className="text-[10px] font-bold text-red-900 px-1">İptal edilsin mi?</span>
                              <button
                                type="button"
                                disabled={cancelMutation.isPending}
                                onClick={() => handleCancelDelivery(d.id)}
                                className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                              >
                                {cancelMutation.isPending ? 'İptal...' : 'Evet, İptal'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelConfirmId(null)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                              >
                                Vazgeç
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Planlanan Ürünler */}
                      {planItems.length > 0 && (
                        <div className="text-xs text-slate-700 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-400">Ürünler:</span>
                          {planItems.map((pi, piIdx) => (
                            <span
                              key={piIdx}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 font-bold text-slate-800 border border-slate-200/80 text-[11px]"
                            >
                              <strong>{pi.quantity} Adet</strong> {pi.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {d.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          📝 {d.notes}
                        </p>
                      )}

                      {/* Tarih Değiştirme Düzenleme Alanı */}
                      {isEditing && (
                        <div className="mt-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950">
                              ✏️ Randevu Tarih & Saatini Güncelle
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingDeliveryId(null)}
                              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              ✕ Kapat
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Yeni Teslimat Tarihi
                              </label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Saat Aralığı
                              </label>
                              <select
                                value={editSlot}
                                onChange={(e) => setEditSlot(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800"
                              >
                                {TIME_SLOTS.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Not (Opsiyonel)
                            </label>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Not güncellemesi..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingDeliveryId(null)}
                              className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              Vazgeç
                            </button>
                            <button
                              type="button"
                              disabled={!editDate || updateMutation.isPending}
                              onClick={() => handleSaveEdit(d.id)}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                            >
                              {updateMutation.isPending ? 'Kaydediliyor...' : '✓ Randevuyu Güncelle'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
