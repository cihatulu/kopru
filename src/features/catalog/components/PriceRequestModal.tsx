import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { usePublishAnnouncement } from '@/features/announcements';
import { useAuthSession } from '@/features/auth';
import { useSponsorRetailerId } from '../api/useSponsorRetailer';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  onClose: () => void;
}

export function PriceRequestModal({ product, onClose }: Props) {
  const { data: user } = useAuthSession();
  const org = user?.org;
  const publish = usePublishAnnouncement();

  const [newPrice, setNewPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const knownSponsor = org?.createdByOrgId || user?.sponsorOrgId || null;
  // Sponsor bilinmiyorsa ilişkiden okunur; biliniyorsa sorgu hiç açılmaz.
  const sponsor = useSponsorRetailerId(org?.id, !knownSponsor);
  const isResolving = sponsor.isFetching;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setError(null);

    const priceNum = Number(newPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Lütfen geçerli bir fiyat girin.');
      return;
    }

    const targetRetailerId = knownSponsor ?? sponsor.data ?? null;

    if (!targetRetailerId) {
      setError('Sizi ekleyen perakendeci bilgisine ulaşılamadı.');
      return;
    }

    publish.mutate(
      {
        ownerOrgId: org.id,
        targetRetailerOrgId: targetRetailerId,
        title: `Fiyat Değişiklik Talebi: ${product.name}`,
        body: `${org.companyName} firması "${product.name}" (${product.code}) ürününün satış fiyatını ${formatMoney(
          product.supplierPrice,
        )} ➔ ${formatMoney(priceNum)} olarak güncellemek istiyor.${
          note.trim() ? `\n\nTalep Notu: ${note.trim()}` : ''
        }`,
      },
      {
        onSuccess: () => {
          setSent(true);
          setTimeout(() => {
            onClose();
          }, 2000);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Talep iletilemedi.');
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Fiyat Değişiklik Talebi</h2>
            <p className="text-xs text-slate-500 font-medium">
              Satış fiyatı değişikliği perakendeciniz onay vermeden işlenemez.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="rounded-xl bg-emerald-50 p-5 text-center space-y-2 border border-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-8 text-emerald-600 mx-auto">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <h3 className="text-sm font-bold text-emerald-900">Talep İletildi</h3>
            <p className="text-xs text-emerald-700">
              Fiyat değişiklik talebiniz perakendecinize başarıyla gönderildi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ürün Bilgisi</span>
              <p className="text-sm font-extrabold text-slate-800">{product.name}</p>
              <p className="text-xs text-slate-500 font-medium">Mevcut Fiyat: {formatMoney(product.supplierPrice)}</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                İstenen Yeni Satış Fiyatı (₺) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Örn: 12000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Talep Açıklaması / Notu <span className="text-slate-400 font-normal">(Opsiyonel)</span>
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Neden fiyat güncellemesi talep edildiğini yazabilirsiniz..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-bold border border-red-200">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={publish.isPending || isResolving}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {publish.isPending || isResolving ? 'Gönderiliyor...' : 'Talebi Perakendeciye İlet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
