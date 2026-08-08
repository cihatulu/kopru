import { ORG_KIND, type OrgKind } from '@/constants';

export interface Invitation {
  id: string;
  token: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  authorizedName: string | null;
  vknTc: string | null;
  discountRate: number;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export type InviteState = 'pending' | 'used' | 'revoked' | 'expired';

/**
 * Davetin durumu — DB'de kolon olarak TUTULMAZ, türetilir.
 *
 * Saklansaydı "süresi doldu"yu yazacak bir job gerekirdi ve o job çalışmadığı
 * her an listede yalan bir "Bekliyor" görünürdü. Zaman geçtikçe kendiliğinden
 * doğrulanan tek yol türetmektir.
 *
 * Sıra önemli: kullanılmış bir davetin süresi dolmuş olabilir; kullanıcı için
 * anlamlı olan "kullanıldı"dır.
 */
export function inviteState(inv: Invitation, now: Date = new Date()): InviteState {
  if (inv.usedAt) return 'used';
  if (inv.revokedAt) return 'revoked';
  if (new Date(inv.expiresAt).getTime() <= now.getTime()) return 'expired';
  return 'pending';
}

export const INVITE_STATE_LABEL: Record<InviteState, string> = {
  pending: 'Bekliyor',
  used: 'Tamamlandı',
  revoked: 'İptal edildi',
  expired: 'Süresi doldu',
};

/** Yalnız bekleyen davetin linki işe yarar; kopyalama/iptal buna bağlı. */
export function isActionable(state: InviteState): boolean {
  return state === 'pending';
}

/** Davet linki. Token URL'de taşınır; başka hiçbir parametre gerekmez. */
export function inviteUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/davet/${encodeURIComponent(token)}`;
}

/** Daveti gönderen üreticiyse davet edilen perakendecidir; tersi de öyle (A15). */
export function invitedKind(inviterKind: OrgKind): OrgKind {
  return inviterKind === ORG_KIND.manufacturer ? ORG_KIND.retailer : ORG_KIND.manufacturer;
}

/** Ekran başlıkları — üretici "bayi" davet eder, perakendeci "tedarikçi". */
export function inviteNoun(inviterKind: OrgKind): string {
  return inviterKind === ORG_KIND.manufacturer ? 'bayi' : 'tedarikçi';
}

/** Kalan gün — 0 ise bugün doluyor demektir. */
export function daysLeft(inv: Invitation, now: Date = new Date()): number {
  const ms = new Date(inv.expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
