/** Toplu stok güncellemenin dört adımı. */
export function StockHowToBanner() {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-left">
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
      <div>
        <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-blue-900">
          Nasıl Kullanılır?
        </h2>
        <ol className="list-inside list-decimal space-y-1.5 text-xs font-semibold leading-relaxed text-blue-800">
          <li>
            <strong>Şablon İndir</strong> ile güncel listenizi bilgisayarınıza kaydedin.
          </li>
          <li>
            Excel'de açın, yalnız <strong>stok</strong> sütununu düzenleyin.
          </li>
          <li>Ürünleri gruplamak isterseniz <strong>Grup Adı</strong> sütununa grup adını yazın.</li>
          <li>
            <strong>Dosya Yükle</strong> ile geri yükleyin — uygulamadan önce önizleme gösterilir.
          </li>
        </ol>
      </div>
    </div>
  );
}
