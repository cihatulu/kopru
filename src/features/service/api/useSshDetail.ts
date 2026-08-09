import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import { signServicePhotos } from '@/lib/servicePhotos';
import { nullableStr, str, type Row, type SshStatus } from './shared';

const LOG_COLUMNS =
  'id, from_status, to_status, note, created_at, actor_org_id, actor_user_id';

const DETAIL_COLUMNS =
  'id, title, description, status, created_at, updated_at, images, relationship_id, ' +
  'order_id, product_id, customer_name, customer_phone, ' +
  'manufacturer_org_id, retailer_org_id';

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
  title: string;
  description: string | null;
  status: SshStatus;
  createdAt: string;
  updatedAt: string;
  relationshipId: string;
  manufacturerOrgId: string;
  retailerOrgId: string;
  customerName: string | null;
  customerPhone: string | null;
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

/**
 * Tek servis talebinin tam görünümü: kayıt + durum geçmişi + fotoğraflar.
 *
 * Fotoğraflar private bucket'ta durduğu için her açılışta imzalanır; imzalı URL
 * kısa ömürlüdür, bu yüzden ÖNBELLEĞE UZUN SÜRE alınamaz — `staleTime` bilerek
 * kısa tutulur (imza süresi dolmuş bir URL kırık görsel demek olurdu).
 */
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
      const paths = Array.isArray(r.images) ? (r.images as string[]) : [];

      const { data: logRows, error: logError } = await supabase
        .from('ssh_status_logs')
        .select(LOG_COLUMNS)
        .eq('ssh_id', sshId!)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (logError) throw logError;

      return {
        id: str(r.id),
        title: str(r.title),
        description: nullableStr(r.description),
        status: r.status as SshStatus,
        createdAt: str(r.created_at),
        updatedAt: str(r.updated_at),
        relationshipId: str(r.relationship_id),
        manufacturerOrgId: str(r.manufacturer_org_id),
        retailerOrgId: str(r.retailer_org_id),
        customerName: nullableStr(r.customer_name),
        customerPhone: nullableStr(r.customer_phone),
        imagePaths: paths,
        imageUrls: await signServicePhotos(paths),
        logs: (logRows ?? []).map(toLog),
      };
    },
  });
}
