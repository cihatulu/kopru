import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import { signServicePhotos } from '@/lib/servicePhotos';
import { nested, nullableStr, str, type Row, type SshStatus } from './shared';
import { sshCode as makeSshCode } from '../domain/sshCode';

const LOG_COLUMNS =
  'id, from_status, to_status, note, created_at, actor_org_id, actor_user_id';

const DETAIL_COLUMNS =
  'id, title, description, status, created_at, updated_at, images, relationship_id, ' +
  'order_id, product_id, quantity, customer_name, customer_phone, ' +
  'manufacturer_org_id, retailer_org_id, ' +
  'orders(order_no, order_items(id, quantity, product_id, product_snapshot)), ' +
  'retailer:retailer_org_id(company_name), manufacturer:manufacturer_org_id(company_name), ' +
  'ssh_request_items(product_id, product_name, quantity)';

export interface SshLogEntry {
  id: string;
  fromStatus: SshStatus | null;
  toStatus: SshStatus;
  note: string | null;
  createdAt: string;
  actorOrgId: string;
}

export interface SshDetail {
  id: string;
  sshCode: string;
  orderNo: string;
  title: string;
  description: string | null;
  status: SshStatus;
  createdAt: string;
  updatedAt: string;
  relationshipId: string;
  manufacturerOrgId: string;
  retailerOrgId: string;
  retailerName: string;
  customerName: string | null;
  customerPhone: string | null;
  items: { name: string; quantity: number }[];
  /** Depolama yolları — kalıcı kimlik budur. */
  imagePaths: string[];
  /** `imagePaths` ile AYNI sırada imzalı görüntüleme URL'leri. */
  imageUrls: string[];
  logs: SshLogEntry[];
}

function toLog(raw: unknown): SshLogEntry {
  const r = raw as Row;
  return {
    id: str(r.id),
    fromStatus: (r.from_status as SshStatus | null) ?? null,
    toStatus: r.to_status as SshStatus,
    note: nullableStr(r.note),
    createdAt: str(r.created_at),
    actorOrgId: str(r.actor_org_id),
  };
}

export function useSshDetail(sshId: string | null) {
  return useQuery({
    queryKey: ['service', 'ssh-detail', sshId],
    enabled: !!sshId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<SshDetail> => {
      const { data, error } = await supabase
        .from('ssh_requests')
        .select(DETAIL_COLUMNS)
        .eq('id', sshId!)
        .single();
      if (error) throw error;

      const r = data as unknown as Row;
      const id = str(r.id);
      const createdAt = str(r.created_at);
      const code = makeSshCode(id, createdAt);

      const orderObj = nested(r.orders);
      const orderNo = str(orderObj.order_no) || '—';
      const orderItemsRaw = (Array.isArray(orderObj.order_items) ? orderObj.order_items : []) as Row[];

      const dbItems = (Array.isArray(r.ssh_request_items) ? r.ssh_request_items : []) as Row[];

      const items: { name: string; quantity: number }[] = [];
      if (dbItems.length > 0) {
        dbItems.forEach((item) => {
          items.push({
            name: str(item.product_name) || 'Ürün',
            quantity: Number(item.quantity || 1),
          });
        });
      } else {
        // Fallback to old behavior
        const sshProductId = r.product_id ? str(r.product_id) : null;
        const sshQuantity = Number(r.quantity || 1);

        const matchedOrderItem = orderItemsRaw.find((oi) => {
          const oiProductId = oi.product_id ? str(oi.product_id) : null;
          return sshProductId && oiProductId === sshProductId;
        }) ?? orderItemsRaw[0];

        if (matchedOrderItem) {
          const snap = nested(matchedOrderItem.product_snapshot);
          items.push({
            name: str(snap.name) || str(r.title) || 'Ürün',
            quantity: sshQuantity,
          });
        } else if (r.title) {
          items.push({ name: str(r.title), quantity: sshQuantity });
        }
      }

      const paths = Array.isArray(r.images) ? (r.images as string[]) : [];

      const { data: logRows, error: logError } = await supabase
        .from('ssh_status_logs')
        .select(LOG_COLUMNS)
        .eq('ssh_id', sshId!)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (logError) throw logError;

      const retailerObj = nested(r.retailer);
      const retailerName = str(retailerObj.company_name) || 'Perakendeci Firma';

      return {
        id,
        sshCode: code,
        orderNo,
        title: str(r.title),
        description: nullableStr(r.description),
        status: r.status as SshStatus,
        createdAt,
        updatedAt: str(r.updated_at),
        relationshipId: str(r.relationship_id),
        manufacturerOrgId: str(r.manufacturer_org_id),
        retailerOrgId: str(r.retailer_org_id),
        retailerName,
        customerName: nullableStr(r.customer_name),
        customerPhone: nullableStr(r.customer_phone),
        items,
        imagePaths: paths,
        imageUrls: await signServicePhotos(paths),
        logs: (logRows ?? []).map(toLog),
      };
    },
  });
}
