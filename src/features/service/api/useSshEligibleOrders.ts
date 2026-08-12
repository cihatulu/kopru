import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { SshOrderSummary } from '../domain/sshDraft';

// Açık kolon listesi (kilitli kural 19). `ssh_requests` gömmesi, siparişin
// SSH kotasını AYRI bir sorgu olmadan sayabilmek için var.
const COLUMNS = `
  id,
  order_no,
  created_at,
  relationship_id,
  manufacturer:manufacturer_org_id(company_name),
  order_items(id, product_id, quantity, product_snapshot),
  ssh_requests(id, status)
`;

/** SSH kapanmış sayılan durumlar — açık talep sayımının dışında kalır. */
const CLOSED_SSH = ['tamamlandi', 'iptal'];

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as unknown[]).map(nested) : []);

export interface SshOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
}

export interface SshEligibleOrder extends SshOrderSummary {
  id: string;
  createdAt: string;
  relationshipId: string;
  manufacturerName: string;
  items: SshOrderItem[];
}

function toOrder(raw: unknown): SshEligibleOrder {
  const o = nested(raw);
  const ssh = list(o.ssh_requests);

  return {
    id: str(o.id),
    orderNo: str(o.order_no),
    createdAt: str(o.created_at),
    relationshipId: str(o.relationship_id),
    manufacturerName: str(nested(o.manufacturer).company_name) || 'Tedarikçi Firma',
    openSshCount: ssh.filter((s) => !CLOSED_SSH.includes(str(s.status))).length,
    totalSshCount: ssh.length,
    items: list(o.order_items).map((i) => ({
      id: str(i.id),
      productId: str(i.product_id),
      name: str(nested(i.product_snapshot).name) || 'Ürün',
      quantity: Number(i.quantity ?? 1),
    })),
  };
}

/**
 * SSH talebi açılabilecek siparişler.
 *
 * Kapsamı RLS belirler (A16); ayrıca org süzgeci yazılmaz. İptal edilmiş
 * siparişler listelenmez — olmayan bir siparişe servis talebi açılamaz.
 */
export function useSshEligibleOrders(myOrgId: string) {
  return useQuery({
    queryKey: ['service', 'ssh-eligible-orders', myOrgId],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<SshEligibleOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(COLUMNS)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(toOrder);
    },
  });
}
