import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { OrderStatus } from '@/features/orders';
import type { SshOrderSummary } from '../domain/sshDraft';

// Açık kolon listesi (kilitli kural 19). `ssh_requests` gömmesi, siparişin SSH
// kotasını AYRI bir sorgu olmadan sayabilmek için var.
const COLUMNS = `
  id,
  order_no,
  created_at,
  relationship_id,
  manufacturer:manufacturer_org_id(company_name),
  order_items(id, product_id, quantity, supplier_unit_price, product_snapshot),
  ssh_requests(id, status),
  return_requests(id, status, items)
`;

/** SSH kapanmış sayılan durumlar — açık talep sayımının dışında kalır. */
const CLOSED_SSH = ['tamamlandi', 'iptal'];

/** İade yalnız yola çıkmış siparişten istenebilir. */
export const RETURNABLE_STATUSES: OrderStatus[] = [
  'shipped',
  'partially_shipped',
  'delivered',
  'return_requested',
];

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as unknown[]).map(nested) : []);

export interface ServiceOrderItem {
  id: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrder extends SshOrderSummary {
  id: string;
  createdAt: string;
  relationshipId: string;
  manufacturerName: string;
  items: ServiceOrderItem[];
}

function toOrder(raw: unknown): ServiceOrder {
  const o = nested(raw);
  const ssh = list(o.ssh_requests);
  const returns = list(o.return_requests);
  const approvedReturns = returns.filter((r) => str(r.status) === 'approved');

  // Build a map of order_item_id -> returned_quantity
  const returnedQtys: Record<string, number> = {};
  approvedReturns.forEach((ret) => {
    const itemsList = Array.isArray(ret.items) ? ret.items : [];
    itemsList.forEach((it) => {
      const itemObj = nested(it);
      const itemId = str(itemObj.order_item_id);
      const qty = Number(itemObj.quantity ?? 0);
      returnedQtys[itemId] = (returnedQtys[itemId] || 0) + qty;
    });
  });

  return {
    id: str(o.id),
    orderNo: str(o.order_no),
    createdAt: str(o.created_at),
    relationshipId: str(o.relationship_id),
    manufacturerName: str(nested(o.manufacturer).company_name) || 'Tedarikçi Firma',
    openSshCount: ssh.filter((s) => !CLOSED_SSH.includes(str(s.status))).length,
    totalSshCount: ssh.length,
    items: list(o.order_items)
      .map((i) => {
        const snap = nested(i.product_snapshot);
        const itemId = str(i.id);
        const originalQty = Number(i.quantity ?? 1);
        const returnedQty = returnedQtys[itemId] || 0;
        return {
          id: itemId,
          productId: str(i.product_id),
          name: str(snap.name) || 'Ürün',
          code: str(snap.code),
          quantity: Math.max(0, originalQty - returnedQty),
          unitPrice: Number(i.supplier_unit_price ?? 0),
        };
      })
      .filter((item) => item.quantity > 0),
  };
}

/**
 * Servis akışlarının (SSH ve iade) sipariş listesi.
 *
 * Kapsamı RLS belirler (A16); ayrıca org süzgeci yazılmaz. `statuses`
 * verilmezse iptal edilenler dışındaki tüm siparişler döner — olmayan bir
 * siparişe ne servis ne iade açılabilir.
 */
export function useServiceOrders(myOrgId: string, statuses?: OrderStatus[]) {
  return useQuery({
    queryKey: ['service', 'orders', myOrgId, statuses ?? 'all'],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<ServiceOrder[]> => {
      let q = supabase.from('orders').select(COLUMNS).order('created_at', { ascending: false });
      q = statuses ? q.in('status', statuses) : q.neq('status', 'cancelled');

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toOrder);
    },
  });
}
