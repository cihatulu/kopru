import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { productSchema, type ProductForm } from '../domain/productSchema';
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
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (payload: ProductSubmit) => void;
}

export function ProductDialog(props: Props) {
  const { product, initialCost, initialStock, orgId, groups, allProducts } = props;
  const { pending, errorMessage, onClose, onSubmit } = props;

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [setContents, setSetContents] = useState<SetLine[]>(product?.setContents ?? []);
  const [type, setType] = useState<'single' | 'set'>(product?.type ?? 'single');
  const [groupId, setGroupId] = useState<string | null>(product?.groupId ?? null);
  // Yeni üründe henüz id yok; görseller kaydetmeden önce yüklendiği için
  // geçici ve kararlı bir klasör adı gerekiyor.
  const [draftId] = useState(() => product?.id ?? `draft-${Date.now()}`);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      code: product?.code ?? '',
      supplierPrice: product?.supplierPrice ?? 0,
      costPrice: initialCost ?? '',
      description: product?.description ?? '',
      width: product?.dimensions.width ?? '',
      depth: product?.dimensions.depth ?? '',
      height: product?.dimensions.height ?? '',
      stock: initialStock ?? '',
    },
  });

  const submit = (values: ProductForm) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Ürünü düzenle' : 'Ürün ekle'}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">
          {product ? 'Ürünü düzenle' : 'Ürün ekle'}
        </h2>

        <form
          onSubmit={(e) => void form.handleSubmit(submit)(e)}
          className="mt-5 space-y-5"
        >
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(['single', 'set'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  type === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {t === 'single' ? 'Tekil ürün' : 'Set ürün'}
              </button>
            ))}
          </div>

          <ProductBasicFields
            form={form}
            groups={groups}
            groupId={groupId}
            onGroupChange={setGroupId}
          />

          <ImageUploader
            orgId={orgId}
            productId={draftId}
            images={images}
            onChange={setImages}
          />

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

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
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
      </div>
    </div>
  );
}
