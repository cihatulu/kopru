import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';

// Gömme ipucu KISIT ADIYLA verilir: `announcements` → `organizations` yabancı
// anahtarı A15 gereği bileşiktir ((owner_org_id, owner_kind) → (id, kind)) ve
// PostgREST bileşik kısıtı kolon adından çözemez. Kolon ipucu kullanıldığında
// duyuru listesi hiç yüklenmiyordu.
const OWNER_FK = 'announcements_owner_org_id_owner_kind_fkey';
const COLUMNS =
  'id, title, body, is_active, created_at, owner_org_id, target_retailer_org_id, image_url, ' +
  `owner:organizations!${OWNER_FK}(company_name), ` +
  // dismissed kontrolü: mevcut kullanıcının okuma kaydını (varsa) left-join ile çek.
  // Üretici görünümünde satır gelmez (RLS gereği), null olur → dismissed=false demektir.
  'myRead:announcement_reads(dismissed)';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  ownerOrgId: string;
  ownerName: string;
  /** Doluysa duyuru tek bir perakendeciye özeldir. */
  targetRetailerOrgId: string | null;
  imageUrl: string | null;
}

function toAnnouncement(raw: unknown): Announcement {
  const r = raw as Row;
  const owner = (r.owner && typeof r.owner === 'object' ? r.owner : {}) as Row;
  return {
    id: str(r.id),
    title: str(r.title),
    body: str(r.body),
    isActive: r.is_active as boolean,
    createdAt: str(r.created_at),
    ownerOrgId: str(r.owner_org_id),
    ownerName: str(owner.company_name) || '—',
    targetRetailerOrgId: typeof r.target_retailer_org_id === 'string'
      ? r.target_retailer_org_id
      : null,
    imageUrl: typeof r.image_url === 'string' ? r.image_url : null,
  };
}

/** dismissed=true olan kayıtları tespit eder (perakendeci gizlemiş). */
function isDismissed(raw: unknown): boolean {
  const r = raw as Row;
  // myRead, PostgREST tarafından tek eşleşen satır ise obje, eşleşmeyince null döner.
  // Dizide gelen formatta da desteklenir.
  const myRead = r.myRead;
  if (!myRead) return false;
  const read = Array.isArray(myRead) ? myRead[0] : myRead;
  if (!read || typeof read !== 'object') return false;
  return (read as Row).dismissed === true;
}

/** Duyurular — RLS hem sahibi hem aktif müşteriyi kapsar. Keyset sayfalama (A17). */
export function useAnnouncements() {
  return useInfiniteQuery({
    queryKey: ['announcements'],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('announcements')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      // dismissed=true olanları listeden çıkar (perakendeci gizlemiş).
      return (data ?? []).filter((row) => !isDismissed(row)).map(toAnnouncement);
    },
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const l = last[last.length - 1];
      return l ? { createdAt: l.createdAt, id: l.id } : undefined;
    },
  });
}
