---
name: new-feature
description: src/features/<ad> altında api/ + domain/ + components/ + index.ts iskeleti oluştur; katman ve dosya bütçesi kurallarına uygun. Yeni domain feature'ı eklerken kullan (A19 + A20).
---

# new-feature

Her feature üç katmana ayrılır ve dışarıya **yalnız `index.ts`** gösterir.

## Klasör yapısı

```
src/features/<ad>/
  api/
    use<Ad>List.ts       # keyset sorgu + react-query   (≤150 satır)
    use<Ad>Detail.ts
    use<Ad>Mutations.ts
    columns.ts           # açık kolon listeleri (A17 + A4)
  domain/
    <konu>.ts            # SAF mantık — react/supabase/DOM YOK  (≤200 satır)
    <konu>.test.ts       # gerçek fonksiyonu import eder
  components/
    <Ad>List.tsx         # (≤200 satır)
    <Ad>Row.tsx
  index.ts               # public yüzey — dışarıya SADECE bu
```

## Katman kuralları (A20 — hook bloklar)

- **api/**: Supabase'e dokunan tek yer. Realtime → `queryClient.invalidateQueries`.
- **domain/**: saf fonksiyon. `%90` test kapsamı eşiği yalnız buraya uygulanır.
- **components/**: sunum + form (react-hook-form + zod, tek şema). Doğrudan supabase yok.
- Başka feature'ın iç dosyası import edilemez — `@/features/<ad>` public yüzeyi kullanılır.

## Sorgu şablonu — keyset pagination (A17)

`OFFSET` ve `select('*')` yasak. Kolonlar `columns.ts`'te toplanır.

```ts
// api/columns.ts — A4'ün ikinci savunma hattı: gizli fiyat kolonu buraya yazılamaz.
export const ORDER_LIST_COLUMNS =
  'id, order_no, status, total_amount, created_at, retailer_org_id, manufacturer_org_id';

// api/useOrderList.ts
export function useOrderList(cursor?: { createdAt: string; id: string }) {
  return useQuery({
    queryKey: ['orders', 'list', cursor ?? null],
    staleTime: STALE_TIME.transactional,
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select(ORDER_LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);
      // Keyset: son satırdan devam et. RLS zaten org kapsamını daraltıyor (A16).
      if (cursor) q = q.lt('created_at', cursor.createdAt);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
```

## domain test şablonu

```ts
import { computeRemaining } from './remaining';   // GERÇEK fonksiyon
test('kısmi sevkiyat kalan adedi', () => {
  expect(computeRemaining({ ordered: 10, shipped: 4 })).toBe(6);
});
```

## Dosya bütçesi (A19)

page 150 · api 150 · domain 200 · component 200 satır. Sınıra yaklaşan dosya **bölünür**;
hook aşan yazımı bloklar. "Sonra bölerim" yoktur.
