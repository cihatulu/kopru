// Açık kolon listeleri (KİLİTLİ KURAL 19). `select('*')` yasak — hem gereksiz
// veri taşımamak hem de gizli fiyat kolonlarının kazara seçilmemesi için (A4).

export const ORG_LIST_COLUMNS =
  'id, kind, company_name, vkn_tc, email, phone, authorized_name, ' +
  'is_subscriber, plan, subdomain, is_active, active_relationship_count, created_at';

export const RELATIONSHIP_LIST_COLUMNS =
  'id, status, discount_rate, created_at, activated_at, ' +
  'manufacturer:manufacturer_org_id(id, company_name, vkn_tc, is_subscriber), ' +
  'retailer:retailer_org_id(id, company_name, vkn_tc, is_subscriber)';

export const SUBSCRIPTION_REQUEST_COLUMNS =
  'id, status, requested_plan, note, created_at, ' +
  'organization:org_id(id, kind, company_name, vkn_tc, is_subscriber)';
