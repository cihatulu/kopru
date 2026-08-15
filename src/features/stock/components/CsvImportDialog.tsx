import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { parseCsv, type ParsedCsv, type StockCsvRow } from '../domain/csv';
import { looksLikeXlsx, parseXlsx } from '../domain/xlsx';

interface Props {
  pending: boolean;
  /** Sunucunun GERÇEKTEN işlediği satır sayısı. */
  appliedCount: number | null;
  /**
   * Kimliksiz satırlardan doğan PASİF ürün sayısı. Bu yeteneğin olmadığı
   * çağrı yerlerinde (perakendeci) verilmez.
   */
  createdCount?: number | null;
  /** Yeni ürün doğurabiliyorsa önizlemede uyarı gösterilir. */
  canCreateProducts?: boolean;
  onClose: () => void;
  onApply: (rows: StockCsvRow[]) => void;
}

/**
 * CSV içe aktarma.
 *
 * İki aşamalı: önce dosya okunur ve ÖNİZLENİR, sonra kullanıcı onaylar.
 * Tek adımda uygulamak, ayraç/ondalık yanlış yorumlandığında tüm stoğu sessizce
 * bozardı — ve bunu ancak günler sonra fark ederdi.
 */
export function CsvImportDialog({
  pending,
  appliedCount,
  createdCount = null,
  canCreateProducts = false,
  onClose,
  onApply,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');

  // Kimliği boş satır = yeni ürün. Kullanıcı UYGULAMADAN ÖNCE kaç ürün
  // açılacağını görmeli; katalogu sessizce büyütmek kabul edilemez.
  const newRows = canCreateProducts
    ? (parsed?.rows.filter((r) => !r.productId).length ?? 0)
    : 0;

  const [readError, setReadError] = useState<string | null>(null);

  /**
   * Biçim UZANTIDAN DEĞİL, içerikten anlaşılır: kullanıcı Excel'de kaydedip
   * adını `.csv` bırakabiliyor. xlsx bir ZIP'tir ve "PK" ile başlar.
   */
  const read = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setReadError(null);
    try {
      const buffer = await file.arrayBuffer();
      if (looksLikeXlsx(new Uint8Array(buffer.slice(0, 2)))) {
        setParsed(await parseXlsx(buffer));
      } else {
        setParsed(parseCsv(new TextDecoder('utf-8').decode(buffer)));
      }
    } catch {
      setReadError('Dosya okunamadı. Excel (.xlsx) veya CSV bekleniyor.');
    }
  };

  return (
    <Modal
      label={'Excel ile stok yükle'}
      panelClassName={
        'flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      {appliedCount !== null ? (
        <>
          <h2 className="text-lg font-bold text-slate-900">Yükleme tamamlandı</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{appliedCount}</strong> ürünün stoğu güncellendi.
          </p>
          {createdCount !== null && createdCount > 0 && (
            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900">
              <strong>{createdCount}</strong> yeni ürün <strong>pasif</strong> olarak açıldı.
              Katalogda görünmezler ve sipariş edilemezler; Ürün Yönetimi'nden fiyatını girip
              aktifleştirin.
            </p>
          )}
          {parsed && appliedCount + (createdCount ?? 0) < parsed.rows.length && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
              Dosyadaki {parsed.rows.length} satırın{' '}
              {parsed.rows.length - appliedCount - (createdCount ?? 0)} tanesi işlenmedi — bu
              ürünler size ait değil veya silinmiş olabilir.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Kapat</Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-slate-900">Excel ile stok yükle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Şablonu indirin, <strong>stok</strong> sütununu doldurun ve dosyayı geri yükleyin. Diğer
            sütunları, özellikle <strong>ürün kimliğini</strong>, değiştirmeyin.
          </p>

          {readError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
              {readError}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => void read(e.target.files?.[0])}
          />

          <div className="mt-5">
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              {fileName || 'Dosya seç'}
            </Button>
          </div>

          {parsed && (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <p className="text-sm font-medium text-slate-800">
                {parsed.rows.length} satır okundu
                {parsed.errors.length > 0 && `, ${parsed.errors.length} satır atlanacak`}
              </p>

              {newRows > 0 && (
                <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
                  Bunların <strong>{newRows} tanesinin ürün kimliği yok</strong> — yeni ürün olarak{' '}
                  <strong>pasif</strong> açılacak, fiyatı 0 olacak. Katalogda görünmez, sipariş
                  edilemezler.
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
                  {parsed.rows.slice(0, 5).map((r) => (
                    <li key={r.productId}>
                      {r.productName || r.productCode || r.productId} → {r.quantity}
                    </li>
                  ))}
                  {parsed.rows.length > 5 && (
                    <li className="text-slate-400">… ve {parsed.rows.length - 5} satır daha</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button
              loading={pending}
              disabled={!parsed || parsed.rows.length === 0}
              onClick={() => parsed && onApply(parsed.rows)}
            >
              {parsed ? `${parsed.rows.length} satırı uygula` : 'Uygula'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
