import { Button } from '@/components/ui/Button';
import type { BulkStockResult } from '../api/useStockMutations';

interface Props {
  result: BulkStockResult;
  onClose: () => void;
}

/**
 * Yükleme sonucu.
 *
 * Sayı vermek yetmiyor: "0 ürünün stoğu güncellendi" yazan eski ekran
 * kullanıcıya NE YAPACAĞINI söylemiyordu. Atlanan satır varsa sebebi ve
 * çözümü de yazılır.
 */
export function CsvImportResult({ result, onClose }: Props) {
  const { updated, created, skipped } = result;

  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">Yükleme tamamlandı</h2>

      <p className="mt-2 text-sm text-slate-600">
        <strong>{updated}</strong> ürünün stoğu güncellendi.
      </p>

      {created > 0 && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900">
          <strong>{created}</strong> yeni ürün <strong>pasif</strong> olarak açıldı. Katalogda
          görünmezler ve sipariş edilemezler; Ürün Yönetimi'nden fiyatını girip aktifleştirin.
        </p>
      )}

      {skipped > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          <strong>{skipped}</strong> satır işlenmedi: bu satırların ürün kimliği{' '}
          <strong>başka bir firmanın ürününe</strong> ait ya da satırda ürün adı yok. Kimlik
          sütununu Excel'de düzenlemeyin — yeni ürün eklemek için o hücreyi <strong>boş
          bırakmanız</strong> yeterli.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Kapat</Button>
      </div>
    </>
  );
}
