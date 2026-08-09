import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { parseCsv, type ParsedCsv, type StockCsvRow } from '../domain/csv';

interface Props {
  pending: boolean;
  /** Sunucunun GERÇEKTEN işlediği satır sayısı. */
  appliedCount: number | null;
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
export function CsvImportDialog({ pending, appliedCount, onClose, onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');

  const read = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(parseCsv(await file.text()));
  };

  return (
    <Modal
      label={'CSV ile stok yükle'}
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
          {parsed && appliedCount < parsed.rows.length && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
              Dosyadaki {parsed.rows.length} satırın {parsed.rows.length - appliedCount} tanesi
              işlenmedi — bu ürünler size ait değil veya silinmiş olabilir.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Kapat</Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-slate-900">CSV ile stok yükle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Şablonu indirin, <strong>stok</strong> sütununu doldurun ve dosyayı geri yükleyin. Diğer
            sütunları değiştirmeyin.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
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
