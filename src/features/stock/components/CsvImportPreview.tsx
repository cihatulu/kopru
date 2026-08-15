import type { ParsedCsv } from '../domain/csv';

interface Props {
  parsed: ParsedCsv;
  /** Kimliksiz satır sayısı — sıfırsa uyarı gösterilmez. */
  newRows: number;
}

/**
 * Uygulamadan ÖNCEKİ özet.
 *
 * Kaç satır okundu, kaçı atlanacak, kaçından yeni ürün doğacak: kullanıcı
 * dosyayı uygulamadan önce bunları görmeli. Tek adımda uygulamak, ayraç ya da
 * ondalık yanlış yorumlandığında tüm stoğu sessizce bozardı.
 */
export function CsvImportPreview({ parsed, newRows }: Props) {
  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <p className="text-sm font-medium text-slate-800">
        {parsed.rows.length} satır okundu
        {parsed.errors.length > 0 && `, ${parsed.errors.length} satır atlanacak`}
      </p>

      {newRows > 0 && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
          Bunların <strong>{newRows} tanesinin ürün kimliği yok</strong> — yeni ürün olarak{' '}
          <strong>pasif</strong> açılacak, fiyatı 0 olacak. Katalogda görünmez, sipariş edilemezler.
        </p>
      )}

      {parsed.errors.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-red-700">
          {parsed.errors.slice(0, 10).map((e) => (
            <li key={e.line}>
              Satır {e.line}: {e.reason}
            </li>
          ))}
          {parsed.errors.length > 10 && (
            <li className="text-slate-500">… ve {parsed.errors.length - 10} satır daha</li>
          )}
        </ul>
      )}

      {parsed.rows.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-slate-600">
          {parsed.rows.slice(0, 5).map((r, i) => (
            // Yeni ürün satırlarının kimliği YOK; anahtar sırayla üretilir.
            <li key={r.productId || `yeni-${i}`}>
              {r.productName || r.productCode || r.productId} → {r.quantity}
            </li>
          ))}
          {parsed.rows.length > 5 && (
            <li className="text-slate-400">… ve {parsed.rows.length - 5} satır daha</li>
          )}
        </ul>
      )}
    </div>
  );
}
