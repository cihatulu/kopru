import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { productSchema, retailerProductSchema, type ProductForm } from '../domain/productSchema';
import { cleanVariants, type SetLine, type Variant } from '../domain/variants';
import { ImageUploader } from './ImageUploader';
import { VariantEditor } from './VariantEditor';
import { SetEditor } from './SetEditor';
import { ProductBasicFields } from './ProductBasicFields';
import type { CatalogProduct } from '../api/useProducts';
import type { ProductGroup } from '../api/useProductGroups';

export interface ProductSubmit {
  values: ProductForm;
  images: string[];
  type: 'single' | 'set';
  variants: Variant[];
  setContents: SetLine[];
  groupId: string | null;
}

interface Props {
  product?: CatalogProduct | undefined;
  initialCost?: number | undefined;
  initialStock?: number | undefined;
  orgId: string;
  groups: ProductGroup[];
  allProducts: CatalogProduct[];
  /** Daha önce kullanılmış kategoriler — öneri listesi. */
  categories: string[];
  isRetailer?: boolean | undefined;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (payload: ProductSubmit) => void;
}

export function ProductDialog(props: Props) {
  const { product, initialCost, initialStock, orgId, groups, allProducts, categories, isRetailer } = props;
  const { pending, errorMessage, onClose, onSubmit } = props;

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [setContents, setSetContents] = useState<SetLine[]>(product?.setContents ?? []);
  // Set kurmanın TEK yolu başlıktaki 'Set Oluştur' butonudur; bu pencerede
  // ikinci bir yol olması mükerrerdi. Mevcut bir set düzenlenirken tipi korunur.
  const type: 'single' | 'set' = product?.type ?? 'single';
  const [groupId, setGroupId] = useState<string | null>(product?.groupId ?? null);
  // Yeni üründe henüz id yok; görseller kaydetmeden önce yüklendiği için
  // geçici ve kararlı bir klasör adı gerekiyor.
  const [draftId] = useState(() => product?.id ?? `draft-${Date.now()}`);

  const form = useForm<ProductForm>({
    resolver: zodResolver(isRetailer ? retailerProductSchema : productSchema),
    defaultValues: {
      name: product?.name ?? '',
      code: product?.code ?? '',
      category: product?.category ?? '',
      supplierPrice: product?.supplierPrice ?? 0,
      costPrice: initialCost ?? '',
      description: product?.description ?? '',
      width: product?.dimensions.width ?? '',
      depth: product?.dimensions.depth ?? '',
      height: product?.dimensions.height ?? '',
      stock: initialStock ?? '',
    },
  });

  /**
   * Geçersiz gönderim ARTIK SESSİZ DEĞİL.
   *
   * react-hook-form, doğrulama düşerse onSubmit'i hiç çağırmaz. Alanın kendi
   * hata satırı yoksa kullanıcı düğmeye basar ve HİÇBİR ŞEY olmaz — kaydetmiyor
   * şikâyetinin sebebi tam olarak buydu (2000 karakteri aşan açıklama).
   */
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  const onInvalid = (errors: FieldErrors<ProductForm>) => {
    const first = Object.values(errors).find((e) => e?.message);
    setInvalidMessage(
      first?.message ? String(first.message) : 'Formda eksik veya hatalı alanlar var.',
    );
  };

  const submit = (values: ProductForm) => {
    setInvalidMessage(null);
    onSubmit({
      values,
      images,
      type,
      // Yarım doldurulmuş satırlar kaydedilmez.
      variants: cleanVariants(variants),
      setContents: type === 'set' ? setContents : [],
      groupId,
    });
  };

  return (
    <Modal
      label={product ? 'Ürünü düzenle' : 'Ürün ekle'}
      panelClassName={
        'max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <h2 className="text-lg font-bold text-slate-900">
        {product ? 'Ürünü düzenle' : 'Ürün ekle'}
      </h2>

      <form onSubmit={(e) => void form.handleSubmit(submit, onInvalid)(e)} className="mt-5 space-y-5">
        <ProductBasicFields
          form={form}
          groups={groups}
          groupId={groupId}
          categories={categories}
          isRetailer={isRetailer}
          onGroupChange={setGroupId}
        />

        <ImageUploader orgId={orgId} productId={draftId} images={images} onChange={setImages} />

        {type === 'set' ? (
          <SetEditor
            lines={setContents}
            available={allProducts}
            editingId={product?.id}
            onChange={setSetContents}
          />
        ) : (
          <VariantEditor variants={variants} onChange={setVariants} />
        )}

        <div>
          <label className="label">Açıklama</label>
          <textarea className="input min-h-20" {...form.register('description')} />
          {form.formState.errors.description && (
            <p className="field-error">{form.formState.errors.description.message}</p>
          )}
        </div>

        {(invalidMessage ?? errorMessage) && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {invalidMessage ?? errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="submit" loading={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
