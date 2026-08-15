export interface PendingStockChange {
  productId: string;
  productName: string;
  /** Kayıt hiç yoksa null — "0 adet" ile aynı şey DEĞİL. */
  from: number | null;
  to: number;
}

/**
 * Onay diyaloğunun gövdesi: hangi ürün, hangi değerden hangi değere.
 *
 * "Emin misiniz?" tek başına bilgi vermez — kullanıcı neyi onayladığını
 * göremezse onay bir tık gürültüsüne dönüşür ve kazayı engellemez.
 */
export function StockChangeMessage({ change }: { change: PendingStockChange }) {
  return (
    <>
      <strong className="text-slate-900">{change.productName}</strong> ürününün stoğu
      değiştirilecek:
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 font-mono text-sm">
        <span className="text-slate-500">{change.from === null ? 'kayıt yok' : change.from}</span>
        <span aria-hidden="true" className="text-slate-400">
          →
        </span>
        <span className="font-bold text-slate-900">{change.to}</span>
      </div>
    </>
  );
}
