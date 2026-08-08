/**
 * Form çıktısını kaydetme yüküne çevirir — SAF (A20).
 *
 * Boş bırakılan sayısal alanlar `undefined` olur, `0` DEĞİL: RPC tarafında
 * `null` gelen stok "değiştirme", `0` gelen stok "sıfırla" demektir. İkisini
 * karıştırmak, boş bırakılan bir alanın stoğu sıfırlamasına yol açardı.
 */
import type { ProductForm } from './productSchema';
import type { SetLine, Variant } from './variants';

export interface ProductSubmitPayload {
  values: ProductForm;
  images: string[];
  type: 'single' | 'set';
  variants: Variant[];
  setContents: SetLine[];
  groupId: string | null;
}

export interface SaveProductPayload {
  id?: string;
  name: string;
  code: string;
  supplierPrice: number;
  costPrice?: number;
  description?: string;
  images: string[];
  groupId: string | null;
  type: 'single' | 'set';
  variants: Variant[];
  setContents: SetLine[];
  width?: number;
  depth?: number;
  height?: number;
  stock?: number;
}

/** Boş dize ve null'ı undefined'a çevirir; sıfırı korur. */
export function optionalNumber(v: unknown): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function toSavePayload(p: ProductSubmitPayload, editingId?: string): SaveProductPayload {
  const v = p.values;
  return {
    ...(editingId ? { id: editingId } : {}),
    name: v.name,
    code: v.code,
    supplierPrice: Number(v.supplierPrice),
    ...(optionalNumber(v.costPrice) === undefined
      ? {}
      : { costPrice: optionalNumber(v.costPrice)! }),
    ...(v.description ? { description: v.description } : {}),
    images: p.images,
    groupId: p.groupId,
    type: p.type,
    variants: p.variants,
    setContents: p.setContents,
    ...(optionalNumber(v.width) === undefined ? {} : { width: optionalNumber(v.width)! }),
    ...(optionalNumber(v.depth) === undefined ? {} : { depth: optionalNumber(v.depth)! }),
    ...(optionalNumber(v.height) === undefined ? {} : { height: optionalNumber(v.height)! }),
    ...(optionalNumber(v.stock) === undefined ? {} : { stock: optionalNumber(v.stock)! }),
  };
}
