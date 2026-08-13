import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  /** Sepette hâlihazırda bulunan üreticinin adı. */
  currentName: string;
  /** Eklenmek istenen ürünün üreticisinin adı. */
  incomingName: string;
  /** Eklenmek istenen ürünün adı. */
  productName: string;
  onCancel: () => void;
  /** Sepeti boşaltıp yalnız yeni ürünle devam et. */
  onReplace: () => void;
}

/**
 * Sepette üretici çakışması.
 *
 * Bir sipariş tek üreticiye verilir (sepet üretici bazlıdır). Sessizce
 * engellemek yerine soruluyor: kullanıcı çoğu zaman gerçekten üretici
 * değiştirmek ister ve sepeti elle boşaltmak zorunda kalmamalı.
 */
export function CartConflictDialog({
  currentName,
  incomingName,
  productName,
  onCancel,
  onReplace,
}: Props) {
  return (
    <Modal label="Sepette farklı üretici" onClose={onCancel}>
      <h2 className="text-lg font-black tracking-tight text-slate-900">
        Sepetinizde başka bir üretici var
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Sepetinizde <span className="font-bold text-slate-900">{currentName}</span> ürünleri
        bulunuyor. <span className="font-bold text-slate-900">{productName}</span> ise{' '}
        <span className="font-bold text-slate-900">{incomingName}</span> ürünü.
      </p>

      <p className="mt-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200">
        Bir sipariş tek üreticiye verilir. Devam ederseniz sepetiniz boşaltılır ve yalnız bu
        ürünle yeni bir sepet başlar.
      </p>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button variant="primary" onClick={onReplace}>
          Sepeti Boşalt ve Ekle
        </Button>
      </div>
    </Modal>
  );
}
