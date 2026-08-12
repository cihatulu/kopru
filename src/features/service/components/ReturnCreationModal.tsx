import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useCreateReturn } from '../api/useServiceMutations';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface DeliveredOrderItem {
  id: string;
  productId: string | null;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
}

interface DeliveredOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  manufacturerName: string;
  items: DeliveredOrderItem[];
}

export function ReturnCreationModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<DeliveredOrder | null>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createReturn = useCreateReturn();

  // Fetch delivered orders
  const { data: deliveredOrders, isLoading } = useQuery({
    queryKey: ['delivered-orders-for-return'],
    queryFn: async (): Promise<DeliveredOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          created_at,
          status,
          manufacturer:manufacturer_org_id(company_name),
          order_items(id, product_id, quantity, supplier_unit_price, product_snapshot)
        `)
        .in('status', ['delivered', 'partially_shipped', 'shipped', 'return_requested'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((o: any) => ({
        id: String(o.id),
        orderNo: String(o.order_no),
        createdAt: String(o.created_at),
        manufacturerName: String(o.manufacturer?.company_name || 'Tedarikçi'),
        items: (o.order_items ?? []).map((i: any) => {
          const snap = (i.product_snapshot || {}) as Record<string, any>;
          return {
            id: String(i.id),
            productId: i.product_id ? String(i.product_id) : null,
            name: String(snap.name || 'Ürün'),
            code: String(snap.code || ''),
            quantity: Number(i.quantity ?? 0),
            unitPrice: Number(i.supplier_unit_price ?? 0),
          };
        }),
      }));
    },
  });

  const filteredOrders = useMemo(() => {
    if (!deliveredOrders) return [];
    if (!searchTerm.trim()) return deliveredOrders;
    const term = searchTerm.toLowerCase();
    return deliveredOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(term) ||
        o.manufacturerName.toLowerCase().includes(term) ||
        o.items.some((i) => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term))
    );
  }, [deliveredOrders, searchTerm]);

  const handleSelectOrder = (order: DeliveredOrder) => {
    setSelectedOrder(order);
    setReturnItems({});
    setErrorMsg(null);
    setStep(2);
  };

  const handleQuantityChange = (orderItemId: string, val: number, max: number) => {
    const qty = Math.max(0, Math.min(val, max));
    setReturnItems((prev) => ({ ...prev, [orderItemId]: qty }));
  };

  const handleSubmit = () => {
    if (!selectedOrder) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (itemsToReturn.length === 0) {
      setErrorMsg('Lütfen iade edilecek en az bir ürün miktarı seçiniz.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Lütfen iade nedenini belirtiniz.');
      return;
    }

    setErrorMsg(null);
    createReturn.mutate(
      {
        orderId: selectedOrder.id,
        items: itemsToReturn,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err.message || 'İade talebi oluşturulurken bir hata oluştu.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-rose-50 to-pink-50/60 rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {step === 1 ? 'Yeni İade Talebi Başlat' : 'İade Detaylarını Girin'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-8 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-rose-500' : 'bg-slate-200'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-rose-500' : 'bg-slate-200'}`} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Sipariş Ara</label>
                <input
                  type="text"
                  placeholder="Sipariş no, tedarikçi adı veya ürün adı ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none"
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Teslim Edilmiş Siparişleriniz ({filteredOrders.length})
                  </p>
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-rose-600">
                            #{order.orderNo}
                          </span>
                          <span className="text-xs text-slate-500">· {order.manufacturerName}</span>
                        </div>
                        <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {order.items.map((item) => (
                            <span key={item.id} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              {item.name} ({item.quantity} Adet)
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="group-hover:bg-rose-500 group-hover:text-white">
                        Seç →
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-xs text-slate-400">
                  Teslim edilmiş ve iade edilebilir sipariş bulunamadı.
                </div>
              )}
            </div>
          ) : (
            selectedOrder && (
              <div className="space-y-5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Sipariş: #{selectedOrder.orderNo}</span>
                    <span className="text-slate-400 ml-2">({selectedOrder.manufacturerName})</span>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-rose-600 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    ← Değiştir
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    İade Edilecek Ürünler ve Miktarları
                  </label>
                  {selectedOrder.items.map((item) => {
                    const currentQty = returnItems[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 bg-white"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.code}</p>
                          <p className="text-[11px] font-semibold text-emerald-600">{formatMoney(item.unitPrice)} / Adet</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, currentQty - 1, item.quantity)}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={currentQty}
                            onChange={(e) => handleQuantityChange(item.id, Number(e.target.value), item.quantity)}
                            className="w-12 text-center text-xs font-bold border border-slate-200 rounded-lg py-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, currentQty + 1, item.quantity)}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-slate-400 ml-1">/ max {item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    İade Nedeni <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Lütfen iade talebinizin nedenini detaylıca açıklayınız..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2.5 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            İptal
          </Button>
          {step === 2 && (
            <Button
              loading={createReturn.isPending}
              onClick={handleSubmit}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              İade Talebi Gönder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
