import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import { useCreateSsh, useSetSshImages } from '../api/useServiceMutations';
import { useCounterparties, type Edge, otherParty } from '@/features/counterparties';
import { uploadServicePhoto } from '@/lib/servicePhotos';

interface Props {
  myOrgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SshOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
}

interface SshOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  relationshipId: string;
  manufacturerName: string;
  items: SshOrderItem[];
  openSshCount: number;
  totalSshCount: number;
}

interface ItemSelection {
  id: string;
  productId: string;
  name: string;
  maxQty: number;
  qty: number;
  selected: boolean;
}

export function SshCreationModal({ myOrgId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SshOrder | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string>('');
  const [items, setItems] = useState<ItemSelection[]>([]);
  const [customProductName, setCustomProductName] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createSsh = useCreateSsh();
  const setSshImages = useSetSshImages();

  // Active counterparties (relationships)
  const counterpartiesQuery = useCounterparties();
  const edges: Edge[] = useMemo(() => {
    return (counterpartiesQuery.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  }, [counterpartiesQuery.data]);

  // Fetch orders directly including related ssh_requests count and statuses
  const { data: deliveredOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-for-ssh-creation', myOrgId],
    queryFn: async (): Promise<SshOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          created_at,
          relationship_id,
          manufacturer:manufacturer_org_id(company_name),
          order_items(id, product_id, quantity, product_snapshot),
          ssh_requests(id, status)
        `)
        .in('status', ['pending', 'confirmed', 'in_production', 'partially_shipped', 'shipped', 'delivered', 'return_requested', 'returned'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[orders-for-ssh-creation] fetch error:', error);
        throw error;
      }

      return (data ?? []).map((o: any) => {
        const sshList = (o.ssh_requests ?? []) as Array<{ id: string; status: string }>;
        const openSshCount = sshList.filter(
          (s) => s.status !== 'tamamlandi' && s.status !== 'iptal',
        ).length;
        const totalSshCount = sshList.length;

        return {
          id: String(o.id),
          orderNo: String(o.order_no),
          createdAt: String(o.created_at),
          relationshipId: String(o.relationship_id),
          manufacturerName: String(o.manufacturer?.company_name || 'Tedarikçi Firma'),
          openSshCount,
          totalSshCount,
          items: (o.order_items ?? []).map((i: any) => {
            const snap = (i.product_snapshot || {}) as Record<string, any>;
            return {
              id: String(i.id),
              productId: i.product_id ? String(i.product_id) : '',
              name: String(snap.name || 'Ürün'),
              quantity: Number(i.quantity ?? 1),
            };
          }),
        };
      });
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
        o.items.some((i) => i.name.toLowerCase().includes(term)),
    );
  }, [deliveredOrders, searchTerm]);

  const handleSelectOrder = (order: SshOrder) => {
    if (order.openSshCount > 0) {
      setErrorMsg(`Sipariş #${order.orderNo} için henüz sonuçlanmamış aktif bir SSH kaydı bulunmaktadır. Yeni talep açmadan önce mevcut talebin sonuçlanması gerekir.`);
      return;
    }

    if (order.totalSshCount >= 2) {
      setErrorMsg(`Sipariş #${order.orderNo} için maksimum SSH talebi sınırına (2 adet) ulaşıldı.`);
      return;
    }

    setSelectedOrder(order);
    setSelectedRelId(order.relationshipId);
    setItems(
      order.items.map((i, idx) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        maxQty: i.quantity,
        qty: i.quantity,
        selected: idx === 0,
      })),
    );
    setErrorMsg(null);
    setStep(2);
  };

  const handleSelectManual = () => {
    setSelectedOrder(null);
    if (edges.length > 0) {
      setSelectedRelId(edges[0].id);
    }
    setItems([]);
    setErrorMsg(null);
    setStep(2);
  };

  const toggleItemSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    );
  };

  const changeItemQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, Math.min(item.maxQty, item.qty + delta));
        return { ...item, qty: newQty };
      }),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const chosen = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const file of chosen) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMsg('Yalnız JPEG, PNG veya WebP fotoğrafları yükleyebilirsiniz.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Fotoğraf boyutu 5 MB sınırını aşamaz.');
        return;
      }
      validFiles.push(file);
    }

    const updated = [...selectedFiles, ...validFiles].slice(0, 3);
    setSelectedFiles(updated);
    setErrorMsg(null);
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    if (selectedOrder) {
      if (selectedOrder.openSshCount > 0) {
        setErrorMsg(`Sipariş #${selectedOrder.orderNo} için henüz sonuçlanmamış aktif bir SSH kaydı mevcuttur.`);
        setIsSubmitting(false);
        return;
      }
      if (selectedOrder.totalSshCount >= 2) {
        setErrorMsg(`Sipariş #${selectedOrder.orderNo} için en fazla 2 kere SSH talebi açılabilir.`);
        setIsSubmitting(false);
        return;
      }
    }

    const selectedItems = items.filter((i) => i.selected);

    if (selectedOrder && items.length > 0 && selectedItems.length === 0) {
      setErrorMsg('Lütfen en az bir problemli ürün seçiniz.');
      setIsSubmitting(false);
      return;
    }

    if (!selectedOrder && !customProductName.trim()) {
      setErrorMsg('Lütfen ürün adı veya bilgisi giriniz.');
      setIsSubmitting(false);
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Lütfen arıza / sorun detayını açıklayınız.');
      setIsSubmitting(false);
      return;
    }

    let targetRelId = selectedOrder?.relationshipId || selectedRelId;
    if (!targetRelId && edges.length > 0) {
      targetRelId = edges[0].id;
    }

    if (!targetRelId) {
      setErrorMsg('Aktif bir tedarikçi ilişkisi bulunamadı.');
      setIsSubmitting(false);
      return;
    }

    // Auto-generate title
    let generatedTitle = '';
    if (selectedItems.length > 0) {
      generatedTitle = `${selectedItems[0].name}${selectedItems.length > 1 ? ` (+${selectedItems.length - 1} ürün)` : ''} SSH Talebi`;
    } else if (customProductName.trim()) {
      generatedTitle = `${customProductName.trim()} SSH Talebi`;
    } else if (selectedOrder) {
      generatedTitle = `Sipariş #${selectedOrder.orderNo} SSH Talebi`;
    } else {
      generatedTitle = `Genel Servis / SSH Talebi`;
    }

    try {
      const sshId = await createSsh.mutateAsync({
        relationshipId: targetRelId,
        title: generatedTitle,
        description: description.trim(),
        orderId: selectedOrder?.id,
        productId: selectedItems[0]?.productId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      });

      if (selectedFiles.length > 0 && sshId) {
        try {
          const paths: string[] = [];
          for (const file of selectedFiles) {
            const uploadRes = await uploadServicePhoto(file, targetRelId, sshId);
            if (uploadRes.path) {
              paths.push(uploadRes.path);
            }
          }

          if (paths.length > 0) {
            await setSshImages.mutateAsync({ id: sshId, paths });
          }
        } catch (photoErr) {
          console.warn('[SshCreationModal] photo upload failed non-critically:', photoErr);
        }
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      console.error('[SshCreationModal] create err:', err);
      setErrorMsg(err.message || 'SSH talebi oluşturulurken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              {step === 1 ? 'Yeni SSH Talebi Başlat' : 'SSH Talebi Detayları'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-8 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Sipariş Ara</label>
                  <input
                    type="text"
                    placeholder="Sipariş no, tedarikçi adı veya ürün adı ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Siparişleriniz ({filteredOrders.length})
                    </p>
                    <button
                      onClick={handleSelectManual}
                      className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer"
                    >
                      + Siparişsiz Manuel Talep Oluştur
                    </button>
                  </div>
                  {filteredOrders.map((order) => {
                    const isOpenBlocked = order.openSshCount > 0;
                    const isLimitBlocked = order.totalSshCount >= 2;
                    const isBlocked = isOpenBlocked || isLimitBlocked;

                    return (
                      <div
                        key={order.id}
                        onClick={() => !isBlocked && handleSelectOrder(order)}
                        className={`p-4 rounded-xl border transition-all ${
                          isBlocked
                            ? 'border-slate-200 bg-slate-50/70 opacity-80 cursor-not-allowed'
                            : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer group'
                        } flex justify-between items-center`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600">
                              #{order.orderNo}
                            </span>
                            <span className="text-xs text-slate-500">· {order.manufacturerName}</span>
                            {isOpenBlocked && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                                ⏳ Devam Eden SSH Talebi Var
                              </span>
                            )}
                            {!isOpenBlocked && isLimitBlocked && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                                🚫 Max SSH Limitine Ulaşıldı (2/2)
                              </span>
                            )}
                            {order.totalSshCount === 1 && !isOpenBlocked && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                ℹ️ 1/2 Talep Kullanıldı
                              </span>
                            )}
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

                        {isOpenBlocked ? (
                          <Button variant="secondary" size="sm" disabled className="opacity-60 bg-amber-50 text-amber-700 border-amber-200">
                            Devam Eden Var
                          </Button>
                        ) : isLimitBlocked ? (
                          <Button variant="secondary" size="sm" disabled className="opacity-60 bg-rose-50 text-rose-700 border-rose-200">
                            Limit Doldu (2/2)
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" className="group-hover:bg-blue-600 group-hover:text-white">
                            Seç →
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed space-y-3">
                  <p className="text-xs text-slate-500 font-medium">Sipariş bulunamadı.</p>
                  <Button onClick={handleSelectManual} size="sm" className="bg-blue-600 text-white font-bold">
                    Siparişsiz Manuel SSH Talebi Oluştur
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selected Order Summary Banner */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
                <div>
                  {selectedOrder ? (
                    <div>
                      <span className="font-bold text-slate-800">Sipariş: #{selectedOrder.orderNo}</span>
                      <span className="text-slate-400 ml-2">({selectedOrder.manufacturerName})</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-800">Genel / Siparişsiz SSH Talebi</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                >
                  ← Değiştir
                </button>
              </div>

              {/* Tedarikçi Firma Seçimi (Eğer sipariş seçilmediyse) */}
              {!selectedOrder && edges.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    TEDARİKÇİ FİRMA <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedRelId}
                    onChange={(e) => setSelectedRelId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none cursor-pointer"
                  >
                    {edges.map((e) => {
                      const p = otherParty(e, myOrgId);
                      return (
                        <option key={e.id} value={e.id}>
                          {p.companyName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* PROBLEMLİ ÜRÜNLER SEÇİMİ */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  PROBLEMLİ ÜRÜNLERİ SEÇİN <span className="text-rose-500">*</span>
                </label>

                {items.length > 0 ? (
                  <div className="space-y-2.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          item.selected
                            ? 'border-blue-400 bg-blue-50/40 shadow-2xs'
                            : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelect(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Sipariş Edilen Adet: <span className="font-bold text-slate-600">{item.maxQty}</span>
                            </p>
                          </div>
                        </label>

                        {item.selected && (
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs flex-shrink-0">
                            <span className="text-[10px] font-extrabold text-slate-500">Talep Adedi:</span>
                            <button
                              type="button"
                              onClick={() => changeItemQty(item.id, -1)}
                              disabled={item.qty <= 1}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-extrabold text-slate-900">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeItemQty(item.id, 1)}
                              disabled={item.qty >= item.maxQty}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Ürün adı veya kodu giriniz..."
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* AÇIKLAMA / SORUN DETAYI */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  AÇIKLAMA / SORUN DETAYI <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Lütfen sorunu detaylı olarak açıklayınız..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
              </div>

              {/* FOTOĞRAFLAR */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  FOTOĞRAFLAR (EN FAZLA 3 ADET)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group bg-slate-50 shadow-2xs">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Sorunlu ürün önizleme"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-600 transition-colors shadow-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {selectedFiles.length < 3 && (
                    <label className="w-full sm:w-auto flex-1 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center cursor-pointer transition-all p-3 text-center">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                        <span>Fotoğraf Yükle</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {3 - selectedFiles.length} adet daha fotoğraf ekleyebilirsiniz.
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* SON KULLANICI / MÜŞTERİ BİLGİLERİ */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  SON KULLANICI / MÜŞTERİ BİLGİLERİ (İSTEĞE BAĞLI)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Müşteri Ad Soyad"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Telefon (05XX...)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          {step === 2 && (
            <Button
              loading={isSubmitting}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
            >
              Talebi Gönder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
