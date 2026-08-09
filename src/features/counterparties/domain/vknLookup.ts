/** VKN önden sorgusunun yorumu — SAF (A20). */
import { ORG_KIND, type OrgKind, type RelationshipStatus } from '@/constants';

export interface OrgLookup {
  found: boolean;
  orgId: string | null;
  companyName: string | null;
  kind: OrgKind | null;
  isSubscriber: boolean;
  /** Aramızda kenar varsa durumu. */
  relationshipStatus: RelationshipStatus | null;
  /** Karşı tarafın giriş hesabı var mı. */
  hasLogin: boolean;
}

export type LookupVerdict =
  | 'unknown'
  | 'new'
  | 'existing-guest'
  | 'existing-subscriber'
  | 'already-linked'
  | 'pending'
  | 'kind-mismatch'
  | 'self';

/**
 * Sorgu sonucunu tek bir karara indirger.
 *
 * A3'ün arayüz karşılığı: VKN yakınsama anahtarıdır. Kullanıcı numarayı
 * yazdığı anda ne olacağını görmeli — yoksa "yeni müşteri açıyorum" sanır,
 * sunucu mevcut kayda bağlar ve neden farklı bir firma adı gördüğünü anlamaz.
 */
export function verdictFor(
  lookup: OrgLookup | null,
  myKind: OrgKind,
  myVknTc: string,
  typedVkn: string,
): LookupVerdict {
  if (normalize(typedVkn) === normalize(myVknTc)) return 'self';
  if (!lookup) return 'unknown';
  if (!lookup.found) return 'new';
  if (lookup.kind === myKind) return 'kind-mismatch';
  if (lookup.relationshipStatus === 'pending') return 'pending';
  if (lookup.relationshipStatus !== null) return 'already-linked';
  return lookup.isSubscriber ? 'existing-subscriber' : 'existing-guest';
}

function normalize(v: string): string {
  return v.replace(/[\s.-]/g, '');
}

/** Karar → kullanıcıya gösterilecek metin. */
export function verdictMessage(v: LookupVerdict, lookup: OrgLookup | null, myKind: OrgKind): string {
  const name = lookup?.companyName ?? 'Bu firma';
  const other = myKind === ORG_KIND.manufacturer ? 'perakendeci' : 'üretici';

  switch (v) {
    case 'self':
      return 'Kendi vergi numaranızı giremezsiniz.';
    case 'new':
      return 'Bu numara sistemde yok. Yeni kayıt açılacak ve giriş bilgilerini siz belirleyeceksiniz.';
    case 'existing-guest':
      return `${name} sistemde kayıtlı. Yeni kayıt AÇILMAYACAK — mevcut kaydına bağlanacaksınız; geçmişi ve cari hesabı olduğu gibi kalır.`;
    case 'existing-subscriber':
      return `${name} zaten platformun abonesi. Hesap açmanıza gerek yok — bağlantı isteği gönderin, onayladığında ilişki aktifleşir.`;
    case 'already-linked':
      return `${name} zaten ${other === 'perakendeci' ? 'müşteriniz' : 'tedarikçiniz'}.`;
    case 'pending':
      return `${name} için bağlantı isteğiniz onay bekliyor.`;
    case 'kind-mismatch':
      return `Bu numara bir ${myKind === ORG_KIND.manufacturer ? 'üretici' : 'perakendeci'} firmaya ait. Aynı tipteki iki firma birbirine bağlanamaz.`;
    default:
      return '';
  }
}

/** Uyarının tonu — kullanıcıya renkle de anlatılır. */
export function verdictTone(v: LookupVerdict): 'info' | 'warn' | 'error' | 'none' {
  if (v === 'new') return 'info';
  if (v === 'existing-guest' || v === 'existing-subscriber') return 'warn';
  if (v === 'self' || v === 'kind-mismatch' || v === 'already-linked' || v === 'pending') {
    return 'error';
  }
  return 'none';
}

export type CredentialsMode = 'ask' | 'subscriber' | 'has-login' | 'hidden';

/**
 * Giriş bilgileri bölümünün durumu.
 *
 * 'ask' VARSAYILANDIR — pencere açıldığında (henüz VKN yazılmamışken) alanlar
 * GÖRÜNÜR olmalı. Önce gizleyip sonra göstermek, kullanıcıya alanın hiç
 * olmadığını düşündürüyordu.
 *
 * Yalnız iki durumda gizlenir ve yerine sebebi yazılır: firma zaten abone
 * (kendi hesabı var) ya da misafir ama girişi zaten açılmış. İkisinde de şifre
 * sormak, kullanıcıya "yeni şifre belirledim" yanılgısı yaşatırdı.
 */
export function credentialsMode(v: LookupVerdict, lookup: OrgLookup | null): CredentialsMode {
  if (v === 'existing-subscriber') return 'subscriber';
  if (v === 'existing-guest') return lookup?.hasLogin ? 'has-login' : 'ask';
  if (v === 'unknown' || v === 'new') return 'ask';
  return 'hidden';
}

/**
 * Şifre ZORUNLU mu.
 *
 * Alanlar görünür olabilir ama zorunlu olmayabilir: VKN henüz yazılmamışken
 * ('unknown') kullanıcının şifreyi önceden doldurmasını engellemeyiz, ancak
 * kaydetme de zaten mümkün değildir.
 */
export function requiresPassword(v: LookupVerdict, lookup: OrgLookup | null): boolean {
  if (v === 'new') return true;
  if (v === 'existing-guest') return !(lookup?.hasLogin ?? false);
  return false;
}

/** Kaydet düğmesinin metni — ne olacağını düğmenin üstünde söylüyoruz. */
export function submitLabel(v: LookupVerdict): string {
  switch (v) {
    case 'existing-guest':
      return 'Mevcut kayda bağla';
    case 'existing-subscriber':
      return 'Bağlantı isteği gönder';
    default:
      return 'Müşteriyi ekle';
  }
}

/** Form gönderilebilir mi. */
export function canSubmit(v: LookupVerdict): boolean {
  return v === 'new' || v === 'existing-guest' || v === 'existing-subscriber';
}
