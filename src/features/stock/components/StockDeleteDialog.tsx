import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteProductPermanently } from '@/features/catalog';

export interface PendingProductDelete {
  productId: string;
  productName: string;
  /** Perakendeci başkasının ürününü siliyorsa zorunlu; kendi ürününde boş. */
  ownerOrgId?: string;
}

interface Props {
  target: PendingProductDelete;
  onClose: () => void;
}

/**
 * Pasif ürünün KALICI silinmesi (kilitli kural 16).
 *
 * Silme yalnız stok listesinden erişilir çünkü hatalı Excel yüklemesinden
 * doğan "stoğu var, katalogda yok" satırları burada görünür. Sunucu hem
 * pasiflik hem yetki koşulunu yeniden doğrular — bu diyalog birinci katmandır.
 */
export function StockDeleteDialog({ target, onClose }: Props) {
  const del = useDeleteProductPermanently();

  return (
    <ConfirmDialog
      title="Ürünü kalıcı olarak sil"
      danger
      confirmLabel="Evet, sil"
      pending={del.isPending}
      onCancel={onClose}
      onConfirm={() =>
        del.mutate(
          { id: target.productId, ...(target.ownerOrgId ? { ownerOrgId: target.ownerOrgId } : {}) },
          { onSuccess: onClose },
        )
      }
      message={
        <div className="space-y-2">
          <p>
            <span className="font-black">{target.productName}</span> ürünü ve stok kaydı kalıcı
            olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <p className="text-xs text-slate-500">
            Geçmiş siparişler etkilenmez; her sipariş satırı kendi anlık görüntüsüyle durur.
          </p>
          {del.isError && (
            <p role="alert" className="text-xs font-bold text-red-600">
              {del.error.message}
            </p>
          )}
        </div>
      }
    />
  );
}
