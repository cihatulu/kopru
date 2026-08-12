/**
 * Ürün formu doğrulaması — SAF (A20).
 *
 * Formda iki fiyat vardır ama farklı tablolara gider (A4):
 *   supplier_price → herkesin gördüğü satış fiyatı
 *   cost_price     → yalnız üreticinin gördüğü maliyet (isteğe bağlı)
 */
import { z } from 'zod';

const parseNumber = (v: unknown): unknown => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const normalized = v.replace(/\s/g, '').replace(',', '.');
    if (normalized === '') return undefined;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : v;
  }
  return v;
};

const money = z.preprocess(
  parseNumber,
  z
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .min(0, 'Negatif olamaz')
    .max(99_999_999, 'Çok büyük'),
);

const optionalMoney = z.preprocess(
  parseNumber,
  z
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .min(0, 'Negatif olamaz')
    .max(99_999_999, 'Çok büyük')
    .optional(),
);

/**
 * Boş bırakılabilen sayı. Boşluk kontrolü ve virgül dönüşümü coercion'dan ÖNCE yapılır.
 */
const optionalNumber = z.preprocess(
  parseNumber,
  z.number({ invalid_type_error: 'Geçerli bir sayı girin' }).min(0, 'Negatif olamaz').max(99_999).optional(),
);

/** Ortak alan tanımı — refine'siz temel nesne. */
const baseProductObject = z.object({
  name: z.string().trim().min(2, 'En az 2 karakter').max(200),
  code: z
    .string()
    .trim()
    .min(1, 'Zorunlu')
    .max(64),
  category: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  supplierPrice: money,
  /**
   * Boş bırakılabilir: "maliyeti bilmiyorum" ile "maliyeti sıfır" farklıdır.
   */
  costPrice: optionalMoney,
  /**
   * Sınır 5000: mobilya açıklamaları (malzeme, ölçü, bakım) uzun olur ve
   * 2000 karakterde kesiliyordu. DB kolonu 'text'; sınır yalnız kazara
   * yapıştırılan devasa metni engellemek için var.
   */
  description: z
    .string()
    .trim()
    .max(5000, 'Açıklama en fazla 5000 karakter olabilir')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),

  // Boyut ve stok isteğe bağlı; girilmezse kayıt güncellenmez.
  width: optionalNumber,
  depth: optionalNumber,
  height: optionalNumber,
  stock: optionalNumber,
});

/**
 * Üretici modunda: üretim maliyeti ≤ satış fiyatı.
 *   costPrice   = üretim maliyeti (gizli)
 *   supplierPrice = perakendeciye satış fiyatı
 */
export const productSchema = baseProductObject.refine(
  (v) => v.costPrice === undefined || v.costPrice <= v.supplierPrice,
  { message: 'Maliyet, satış fiyatından büyük olamaz', path: ['costPrice'] },
);

/**
 * Perakendeci modunda: alış maliyeti ≤ satış fiyatı.
 *   supplierPrice = tedarikçiden alış maliyeti
 *   costPrice     = müşteriye perakende satış fiyatı
 */
export const retailerProductSchema = baseProductObject.refine(
  (v) => v.costPrice === undefined || v.supplierPrice <= v.costPrice,
  { message: 'Alış maliyeti, satış fiyatından büyük olamaz', path: ['costPrice'] },
);

export type ProductForm = z.input<typeof baseProductObject>;

/** Üreticinin bu satıştaki kâr marjı — yalnız üretici tarafında hesaplanır. */
export function marginPercent(supplierPrice: number, costPrice: number | undefined): number | null {
  if (costPrice === undefined || supplierPrice <= 0) return null;
  return Math.round(((supplierPrice - costPrice) / supplierPrice) * 1000) / 10;
}

/** İskonto uygulanmış nihai birim fiyat — `place_order_atomic` ile aynı formül. */
export function discountedPrice(supplierPrice: number, discountRate: number): number {
  return Math.round(supplierPrice * (1 - discountRate / 100) * 100) / 100;
}
