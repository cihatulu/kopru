/**
 * Karşı taraf mantığı — SAF (A20).
 *
 * Bir ilişki kenarının iki ucu vardır; "karşı taraf" kimin baktığına göre değişir.
 * Bu çeviriyi SQL'de yapmak her sorguda dallanma demek olurdu; kenarı olduğu gibi
 * çekip burada çözüyoruz.
 */
import { ORG_KIND, RELATIONSHIP_STATUS, type OrgKind, type RelationshipStatus } from '@/constants';

export interface Party {
  id: string;
  companyName: string;
  vknTc: string;
  isSubscriber: boolean;
  phone: string | null;
  email: string | null;
  authorizedName: string | null;
  address: string | null;
}

export interface Edge {
  id: string;
  status: RelationshipStatus;
  discountRate: number;
  createdAt: string;
  initiatedByOrgId: string;
  manufacturerOrgId: string;
  manufacturer: Party;
  retailer: Party;
}

/** Kenarın bana göre karşı ucu. */
export function otherParty(edge: Edge, myOrgId: string): Party {
  return edge.manufacturerOrgId === myOrgId ? edge.retailer : edge.manufacturer;
}

/** Ben bu kenarda üretici miyim? İskonto yalnız üretici tarafından belirlenir (A5). */
export function isManufacturerSide(edge: Edge, myOrgId: string): boolean {
  return edge.manufacturerOrgId === myOrgId;
}

/** Bana gelen bağlantı isteği: bekliyor ve başlatan ben değilim. */
export function isIncomingRequest(edge: Edge, myOrgId: string): boolean {
  return edge.status === RELATIONSHIP_STATUS.pending && edge.initiatedByOrgId !== myOrgId;
}

/** Benim gönderdiğim, karşı tarafın henüz yanıtlamadığı istek. */
export function isOutgoingRequest(edge: Edge, myOrgId: string): boolean {
  return edge.status === RELATIONSHIP_STATUS.pending && edge.initiatedByOrgId === myOrgId;
}

/** Ekranın başlığı: üretici müşterilerini, perakendeci tedarikçilerini yönetir. */
export function counterpartyTitle(myKind: OrgKind): string {
  return myKind === ORG_KIND.manufacturer ? 'Müşterilerim' : 'Tedarikçilerim';
}

export function counterpartyNoun(myKind: OrgKind): string {
  return myKind === ORG_KIND.manufacturer ? 'perakendeci' : 'üretici';
}

/**
 * Bekleyen bir isteğin açıklaması. Kullanıcı neden bekletildiğini bilmeli:
 * karşı taraf da abone olduğu için tek taraflı bağlanılamıyor.
 */
export function pendingExplanation(edge: Edge, myOrgId: string): string {
  return isIncomingRequest(edge, myOrgId)
    ? 'Bu firma sizi kendi listesine eklemek istiyor.'
    : 'Karşı taraf da abone olduğu için bağlantı onayı bekleniyor.';
}
