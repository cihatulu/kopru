/**
 * Ürün formu doğrulaması — SAF (A20).
 *
 * Formda iki fiyat vardır ama farklı tablolara gider (A4):
 *   supplier_price → herkesin gördüğü satış fiyatı
 *   cost_price     → yalnız üreticinin gördüğü maliyet (isteğe bağlı)
 */
import { z } from 'zod';

const money = z.coerce
  .number({ invalid_type_error: 'Sayı girin' })
  .min(0, 'Negatif olamaz')
  .max(99_999_999, 'Çok büyük');

/**
 * Boş bırakılabilen sayı. Boşluk kontrolü coercion'dan ÖNCE yapılır —
 * `z.coerce.number()` boş dizeyi 0'a çevirir ve "girilmedi" ile "sıfır"
 * birbirine karışır (maliyet alanında tam olarak bu hata yaşandı).
 */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().min(0, 'Negatif olamaz').max(99_999).optional(),
);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'En az 2 karakter').max(200),
    code: z
      .string()
      .trim()
      .min(1, 'Zorunlu')
      .max(64)
      .regex(/^[A-Za-z0-9._/-]+$/, 'Harf, rakam ve . _ / - kullanın'),
    /**
     * Grup › Kategori › Model hiyerarşisinin ORTA kademesi.
     *
     * Serbest metin: üretici ürün eklerken kategoriyi oracıkta yazabilmeli.
     * Yazım tutarlılığı, formdaki öneri listesiyle (daha önce kullanılanlar)
     * sağlanır — ayrı bir yönetim ekranı gerektirmez.
     */
    category: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    supplierPrice: money,
    /**
     * Boş bırakılabilir: "maliyeti bilmiyorum" ile "maliyeti sıfır" farklıdır.
     *
     * DİKKAT: boşluk kontrolü coercion'dan ÖNCE yapılmak zorunda. `z.coerce.number()`
     * boş dizeyi 0'a çevirir; union içinde kullanılırsa maliyet sessizce sıfırlanır
     * ve ürün %100 marjla görünür.
     */
    costPrice: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      money.optional(),
    ),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),

    // Boyut ve stok isteğe bağlı; girilmezse kayıt güncellenmez.
    width: optionalNumber,
    depth: optionalNumber,
    height: optionalNumber,
    stock: optionalNumber,
  })
  .refine((v) => v.costPrice === undefined || v.costPrice <= v.supplierPrice, {
    message: 'Maliyet, satış fiyatından büyük olamaz',
    path: ['costPrice'],
  });

export type ProductForm = z.input<typeof productSchema>;

/** Üreticinin bu satıştaki kâr marjı — yalnız üretici tarafında hesaplanır. */
export function marginPercent(supplierPrice: number, costPrice: number | undefined): number | null {
  if (costPrice === undefined || supplierPrice <= 0) return null;
  return Math.round(((supplierPrice - costPrice) / supplierPrice) * 1000) / 10;
}

/** İskonto uygulanmış nihai birim fiyat — `place_order_atomic` ile aynı formül. */
export function discountedPrice(supplierPrice: number, discountRate: number): number {
  return Math.round(supplierPrice * (1 - discountRate / 100) * 100) / 100;
}
