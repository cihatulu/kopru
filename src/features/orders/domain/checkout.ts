/** Sepetin hangi ilişkiye sipariş vereceğinin çözümü — SAF (A20). */
import type { CartLine } from './cart';

/** İlişkinin sipariş için gereken en küçük gösterimi. */
export interface CartSupplier {
  /** `relationships.id` — siparişin yazılacağı tenant (A9). */
  id: string;
  manufacturerOrgId: string;
  companyName: string;
}

export type CartTarget =
  | { ok: true; relationshipId: string; supplier: CartSupplier }
  | { ok: false; error: string };

export interface CustomerFields {
  name: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  address: string;
  note: string;
}

export const EMPTY_CUSTOMER: CustomerFields = {
  name: '',
  phone: '',
  email: '',
  province: '',
  district: '',
  address: '',
  note: '',
};

const trimmed = (v: string) => v.trim() || undefined;

/**
 * RPC'ye gidecek müşteri yükü.
 *
 * Adres ve iletişim YALNIZ abone perakendecide toplanır; misafirde bu alanlar
 * ekranda hiç görünmez, boş değerlerini göndermek de yanıltıcı olurdu.
 */
export function toOrderCustomer(fields: CustomerFields, isSubscriber: boolean) {
  return {
    name: trimmed(fields.name),
    note: trimmed(fields.note),
    ...(isSubscriber
      ? {
          phone: trimmed(fields.phone),
          email: trimmed(fields.email),
          province: trimmed(fields.province),
          district: trimmed(fields.district),
          address: trimmed(fields.address),
        }
      : {}),
  };
}

/** Sepetteki farklı üreticiler. */
export function manufacturersInCart(lines: CartLine[]): string[] {
  return [...new Set(lines.map((l) => l.manufacturerOrgId).filter(Boolean))];
}

/**
 * Siparişin yazılacağı ilişkiyi SEPET SATIRLARINDAN türetir.
 *
 * Önceden ekran ilk tedarikçiyi (`edges[0]`) sabit kullanıyordu; iki tedarikçisi
 * olan perakendeci ikinci üreticinin ürününü sipariş edemiyordu — sunucu haklı
 * olarak reddediyordu çünkü ürün o ilişkinin üreticisine ait değil.
 *
 * Bir sipariş TEK ilişkiye yazılır (A9). Sepette iki üreticinin ürünü varsa
 * bölmek gerekir; sessizce birine yazmak cariyi bozar.
 */
export function resolveCartTarget(lines: CartLine[], suppliers: CartSupplier[]): CartTarget {
  if (lines.length === 0) return { ok: false, error: 'Sepetiniz boş.' };

  const manufacturers = manufacturersInCart(lines);

  if (manufacturers.length === 0) {
    return {
      ok: false,
      error: 'Sepetteki ürünlerin üreticisi belirlenemedi. Sepeti boşaltıp ürünleri yeniden ekleyin.',
    };
  }

  if (manufacturers.length > 1) {
    const names = manufacturers
      .map((id) => suppliers.find((s) => s.manufacturerOrgId === id)?.companyName ?? 'bilinmeyen')
      .join(', ');
    return {
      ok: false,
      error: `Sepette birden fazla üreticinin ürünü var (${names}). Her üreticiye ayrı sipariş verilir; lütfen sepeti tek üreticiye indirin.`,
    };
  }

  const manufacturerOrgId = manufacturers[0] ?? '';
  const supplier = suppliers.find((s) => s.manufacturerOrgId === manufacturerOrgId);

  if (!supplier) {
    return {
      ok: false,
      error: 'Bu üreticiyle aktif bir tedarikçi ilişkiniz bulunmuyor. Tedarikçilerim sayfasından kontrol edin.',
    };
  }

  return { ok: true, relationshipId: supplier.id, supplier };
}
