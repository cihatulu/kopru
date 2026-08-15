import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { parseCsv, type ParsedCsv, type StockCsvRow } from '../domain/csv';
import { looksLikeXlsx, parseXlsx } from '../domain/xlsx';
import { CsvImportPreview } from './CsvImportPreview';

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
  /**
   * Perakendecide: yeni ürünlerin YAZILACAĞI üretici seçilir. Boş dizi
   * verilirse seçici gösterilmez ve kimliksiz satırlar uygulanamaz.
   * Üreticide verilmez — ürünler zaten kendisinindir.
   */
  manufacturers?: { id: string; name: string }[];
  onClose: () => void;
  onApply: (rows: StockCsvRow[], manufacturerOrgId: string | null) => void;
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
  manufacturers,
  onClose,
  onApply,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');

  // Kimliği boş satır = yeni ürün. Kullanıcı UYGULAMADAN ÖNCE kaç ürün
  // açılacağını görmeli; katalogu sessizce büyütmek kabul edilemez.
  const newRows = canCreateProducts
    ? (parsed?.rows.filter((r) => !r.productId).length ?? 0)
    : 0;

  // Seçici yalnız yeni ürün açabilen çağrı yerinde (perakendeci) vardır ve
  // yalnız dosyada kimliksiz satır varsa anlam taşır.
  const needsManufacturer = manufacturers !== undefined && newRows > 0;
  const blocked = needsManufacturer && !manufacturerId;

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

          {parsed && <CsvImportPreview parsed={parsed} newRows={newRows} />}

          {needsManufacturer && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600" htmlFor="csv-mfr">
                Yeni ürünler hangi üreticinin kataloğuna açılsın?
              </label>
              <select
                id="csv-mfr"
                value={manufacturerId}
                onChange={(e) => setManufacturerId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Üretici seçin…</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {manufacturers.length === 0 && (
                <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
                  Listede üretici yok. Ürün açabilmek için Tedarikçilerim ekranından o üreticinin
                  <strong> ürün yönetimi iznini</strong> açmalısınız; bu izin yalnız misafir
                  üreticiler için verilebilir.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button
              loading={pending}
              disabled={!parsed || parsed.rows.length === 0 || blocked}
              onClick={() => parsed && onApply(parsed.rows, manufacturerId || null)}
            >
              {parsed ? `${parsed.rows.length} satırı uygula` : 'Uygula'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
