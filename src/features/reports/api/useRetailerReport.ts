import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { DateRange, RetailerReportOrder } from '../domain/retailerReport';

// Açık kolon listesi (kilitli kural 19). `salesperson_user_id` → `users` tek
// yabancı anahtar olduğu için kolon ipucu yeterli, kısıt adı gerekmiyor.
const COLUMNS = `
  id, status, created_at, total_amount, parent_order_id,
  manufacturer:manufacturer_org_id(company_name),
  salesperson:salesperson_user_id(id, full_name, user_code),
  parent:parent_order_id(salesperson:salesperson_user_id(id, full_name, user_code)),
  order_items(quantity, supplier_unit_price, order_item_retail_prices(retail_unit_price))
`;

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as unknown[]).map(nested) : []);

/**
 * Siparişin PERAKENDE tutarı (KATMAN 3).
 *
 * Kalemde kayıtlı satış fiyatı yoksa üretici fiyatına düşülür — aksi halde o
 * satır ciroya hiç girmez ve rapor sessizce eksik çıkardı.
 */
function retailTotal(raw: Row): number {
  const items = list(raw.order_items);
  if (items.length === 0) return Number(raw.total_amount ?? 0);

  return items.reduce((sum, i) => {
    const qty = Number(i.quantity ?? 0);
    const pr = i.order_item_retail_prices;
    const first = Array.isArray(pr)
      ? (pr as unknown[])[0]
      : pr && typeof pr === 'object'
        ? pr
        : null;
    const retail = first ? Number((first as Row).retail_unit_price ?? 0) : 0;
    const unit = retail > 0 ? retail : Number(i.supplier_unit_price ?? 0);
    return sum + unit * qty;
  }, 0);
}

function toOrder(raw: unknown): RetailerReportOrder {
  const o = nested(raw);
  
  // Eğer kök siparişin satışçısı varsa, onu kullanalım (child siparişler kök siparişin satışçısına yazılsın)
  const parent = nested(o.parent);
  const parentSalesperson = nested(parent.salesperson);
  const directSalesperson = nested(o.salesperson);
  
  const salesperson = o.parent_order_id && parentSalesperson.id 
    ? parentSalesperson 
    : directSalesperson;

  const id = str(salesperson.id);

  return {
    id: str(o.id),
    status: str(o.status),
    createdAt: str(o.created_at),
    total: Math.round(retailTotal(o) * 100) / 100,
    manufacturerName: str(nested(o.manufacturer).company_name) || 'Bilinmeyen üretici',
    salespersonId: id || null,
    // Eski siparişlerde satışçı yok; ad yerine ham kimlik göstermek anlamsız.
    salespersonName: str(salesperson.full_name).trim() || str(salesperson.user_code) || 'Belirtilmemiş',
  };
}

/**
 * Perakendecinin dönem raporu.
 *
 * Kapsamı RLS belirler (A16); ayrıca org süzgeci yazılmaz. Bitiş günü DAHİL
 * olsun diye ertesi günün başına kadar sorgulanır.
 */
export function useRetailerReport(range: DateRange, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'retailer-period', range.start, range.end],
    enabled,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<RetailerReportOrder[]> => {
      const endExclusive = new Date(`${range.end}T00:00:00Z`);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

      const { data, error } = await supabase
        .from('orders')
        .select(COLUMNS)
        .gte('created_at', `${range.start}T00:00:00Z`)
        .lt('created_at', endExclusive.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(toOrder);
    },
  });
}
