// Açık kolon listeleri (KİLİTLİ KURAL 19). `select('*')` yasak — hem gereksiz
// veri taşımamak hem de gizli fiyat kolonlarının kazara seçilmemesi için (A4).

export const ORG_LIST_COLUMNS =
  'id, kind, company_name, vkn_tc, email, phone, authorized_name, ' +
  'is_subscriber, plan, subdomain, is_active, active_relationship_count, created_by_org_id, created_at, ' +
  'creator:created_by_org_id(company_name)';

// Gömme ipucu KISIT ADIYLA verilir — `relationships` → `organizations` yabancı
// anahtarı A15 gereği bileşiktir ve PostgREST onu kolon adından çözemez
// (ERROR_PROTOCOLS #21). Kolon ipucuyla admin ilişki listesi boş kalıyordu.
const PARTY = 'id, company_name, vkn_tc, is_subscriber';
export const RELATIONSHIP_LIST_COLUMNS =
  'id, status, discount_rate, created_at, activated_at, ' +
  `manufacturer:organizations!relationships_manufacturer_org_id_manufacturer_kind_fkey(${PARTY}), ` +
  `retailer:organizations!relationships_retailer_org_id_retailer_kind_fkey(${PARTY})`;

export const SUBSCRIPTION_REQUEST_COLUMNS =
  'id, status, requested_plan, note, created_at, ' +
  'organization:org_id(id, kind, company_name, vkn_tc, is_subscriber)';
