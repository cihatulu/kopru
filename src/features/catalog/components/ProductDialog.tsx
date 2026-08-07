import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { productSchema, type ProductForm } from '../domain/productSchema';
import { ImageUploader } from './ImageUploader';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product?: CatalogProduct | undefined;
  initialCost?: number | undefined;
  orgId: string;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: ProductForm, images: string[]) => void;
}

export function ProductDialog(props: Props) {
  const { product, initialCost, orgId, pending, errorMessage, onClose, onSubmit } = props;
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  // Yeni üründe henüz id yok; görseller kaydetmeden önce yüklendiği için
  // geçici ve kararlı bir klasör adı gerekiyor.
  const [draftId] = useState(() => product?.id ?? `draft-${Date.now()}`);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      code: product?.code ?? '',
      supplierPrice: product?.supplierPrice ?? 0,
      costPrice: initialCost ?? '',
      description: product?.description ?? '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Ürünü düzenle' : 'Ürün ekle'}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">
          {product ? 'Ürünü düzenle' : 'Ürün ekle'}
        </h2>

        <form
          onSubmit={(e) => void handleSubmit((v) => onSubmit(v, images))(e)}
          className="mt-5 space-y-4"
        >
          <Field label="Ürün adı" error={errors.name?.message}>
            <input className="input" autoFocus {...register('name')} />
          </Field>

          <Field label="Ürün kodu" error={errors.code?.message}>
            <input className="input" {...register('code')} />
          </Field>

          <Field label="Satış fiyatı (₺)" error={errors.supplierPrice?.message}>
            <input className="input" type="number" step="0.01" {...register('supplierPrice')} />
            <p className="mt-1 text-xs text-slate-500">
              Perakendecinin göreceği fiyat. Cari hesap bu tutardan işler.
            </p>
          </Field>

          <Field label="Maliyetiniz (₺) — isteğe bağlı" error={errors.costPrice?.message}>
            <input className="input" type="number" step="0.01" {...register('costPrice')} />
            <p className="mt-1 text-xs text-slate-500">
              Yalnız size görünür. Perakendeci bu bilgiye hiçbir koşulda erişemez.
              Boş bırakırsanız kaydedilmez.
            </p>
          </Field>

          <Field label="Açıklama" error={errors.description?.message}>
            <textarea className="input min-h-20" {...register('description')} />
          </Field>

          <ImageUploader
            orgId={orgId}
            productId={draftId}
            images={images}
            onChange={setImages}
          />

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
