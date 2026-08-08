import { Button } from '@/components/ui/Button';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Ürün silme onayı.
 *
 * Gerçek DELETE yapılmaz — ürün PASİFLEŞTİRİLİR (kilitli kural 16). Sebep:
 * geçmiş siparişler ve cari kayıtlar bu ürüne bağlı; satır silinseydi eski
 * sipariş satırları sahipsiz kalırdı. Metin bunu açıkça söylüyor, yoksa
 * kullanıcı ürünün gerçekten silindiğini sanar.
 */
export function DeleteProductDialog({ product, pending, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ürünü kaldır"
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-3.5 text-red-600">
          <div className="rounded-xl bg-red-50 p-2.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Ürünü kaldır?</h3>
        </div>

        <p className="mb-2 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">{product.name}</span> katalogdan
          kaldırılacak ve perakendecilere görünmeyecek.
        </p>
        <p className="mb-6 text-xs leading-relaxed text-slate-500">
          Ürün veritabanından silinmez, pasife alınır — geçmiş siparişleriniz ve cari
          kayıtlarınız olduğu gibi kalır. İstediğiniz zaman yeniden aktif edebilirsiniz.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button loading={pending} onClick={onConfirm}>
            Evet, kaldır
          </Button>
        </div>
      </div>
    </div>
  );
}
