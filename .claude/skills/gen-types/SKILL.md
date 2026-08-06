---
name: gen-types
description: Supabase şemasından TypeScript tiplerini generate et → src/types/database.generated.ts. Migration/şema değişikliği sonrası kullan (kilitli kural 13). Elle tip veya case-conversion katmanı yazma.
---

# gen-types

DB tipleri **her zaman generate edilir**. Elle yazılmaz, elle snake↔camel katmanı eklenmez.

## Komut

```bash
npm run gen:types          # supabase gen types typescript --linked
```

Yerel stack için:
```bash
supabase gen types typescript --local > src/types/database.generated.ts
```

## Ne zaman

- Her migration sonrası (yeni tablo/kolon/enum/RPC)
- `tsc` "Property does not exist on type" hatasında (ERROR_PROTOCOLS #5)

## Sonra

- `src/types/index.ts` generated tipleri yeniden ihraç eder; domain tipleri buradan türetilir.
- `npm run lint` (tsc --noEmit) ile doğrula.
- Yeni bir fiyat tablosu eklendiyse `/verify-price-isolation` çalıştır.
