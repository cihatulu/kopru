/**
 * Sepet hesapları — SAF (A20).
 *
 * Sepette İKİ fiyat yan yana durur ama farklı yerlere gider (A4):
 *   · unitPrice  = iskontolu alış (KATMAN 2) → siparişe ve cariye yazılır
 *   · retailPrice = perakendecinin satış fiyatı (KATMAN 3) → ayrı tabloya,
 *     üretici hiçbir zaman görmez
 */

export interface CartLine {
  productId: string;
  manufacturerOrgId: string;
  /** Üreticinin ekranda gösterilecek adı; çakışma uyarısında kullanılır. */
  manufacturerName?: string | undefined;
  name: string;
  code: string;
  imageUrl?: string | undefined;
  model?: string | undefined;
  /**
   * KATMAN 2 — iskonto uygulanmış ÜRETİCİ satış fiyatı.
   * Cariye yazılan tek baz budur; sunucu da siparişte bunu yeniden hesaplar.
   */
  supplierUnitPrice: number;
  /**
   * KATMAN 3 — perakendecinin kendi satış fiyatı. Katalogda ve sepette
   * GÖRÜNEN fiyat budur; üretici hiçbir zaman görmez.
   */
  unitPrice: number;
  quantity: number;
  /** Perakendecinin kendi satış fiyatı; isteğe bağlı. */
  retailPrice?: number | undefined;
  /** Müşteri değişiklik talebi açıklaması (opsiyonel). */
  customDescription?: string | undefined;
  /** Müşteri isteğine özel fiyat farkı (₺, opsiyonel). */
  priceDifference?: number | undefined;
}

export interface CartTotals {
  /** Üreticiye ödenecek toplam — cari bu tutardan işler (KATMAN 2). */
  supplierTotal: number;
  /** Perakendecinin beklenen cirosu; yalnız kendisi görür (KATMAN 3). */
  retailTotal: number;
  /** Beklenen kâr = ciro − üreticiye ödenecek. */
  expectedProfit: number;
  lineCount: number;
  /** Toplam adet (parça sayısı). */
  itemCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Satırın PERAKENDE toplamı (KATMAN 3) — sepette gösterilen tutar. */
export function lineTotal(line: CartLine): number {
  const effectivePrice = line.unitPrice + (line.priceDifference || 0);
  return round2(effectivePrice * line.quantity);
}

/**
 * Sepet toplamları.
 *
 * İKİ TOPLAM AYRI HESAPLANIR ve karıştırılmamalıdır:
 *   · `supplierTotal` üreticiye borçlanılan tutardır (KATMAN 2). Sipariş
 *     ekranındaki bağlayıcı sayı budur; cariye bu yazılır.
 *   · `retailTotal` perakendecinin kendi müşterisinden bekledeği tutardır
 *     (KATMAN 3) ve üreticiye hiç gitmez.
 *
 * Eskiden `supplierTotal` de ekranda görünen (yani PERAKENDE) fiyattan
 * hesaplanıyordu; sepet "₺240.000" derken cariye ₺120.000 yazılıyordu.
 *
 * Fiyat farkı yalnız perakende tarafını etkiler: müşteriye özel bir talebin
 * ücreti üreticinin fiyatını değiştirmez.
 */
export function cartTotals(lines: CartLine[]): CartTotals {
  const supplierTotal = round2(
    lines.reduce((sum, l) => sum + l.supplierUnitPrice * l.quantity, 0),
  );
  const retailTotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));

  return {
    supplierTotal,
    retailTotal,
    expectedProfit: round2(retailTotal - supplierTotal),
    lineCount: lines.length,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/**
 * Sepetin bağlı olduğu üretici; sepet boşsa null.
 *
 * SEPET ÜRETİCİ BAZLIDIR: bir sipariş = bir üretici. Sepette birden çok üretici
 * bulunamayacağı için ilk satır sepetin tamamını temsil eder.
 */
export function cartManufacturerOrgId(lines: CartLine[]): string | null {
  return lines[0]?.manufacturerOrgId ?? null;
}

/** Sepetteki üreticinin adı; bilinmiyorsa jenerik metin. */
export function cartManufacturerName(lines: CartLine[]): string {
  return lines[0]?.manufacturerName?.trim() || 'başka bir üretici';
}

/**
 * Eklenmek istenen satır sepetteki üreticiyle çakışıyor mu?
 *
 * Çakışma eskiden yalnız SİPARİŞ ANINDA yakalanıyordu: kullanıcı "Tüm
 * Üreticiler" görünümünde sepeti doldurup en sonda reddediliyordu.
 */
export function conflictsWithCart(lines: CartLine[], line: CartLine): boolean {
  const current = cartManufacturerOrgId(lines);
  return current !== null && current !== line.manufacturerOrgId;
}

/** Aynı ürün aynı değişiklik talebi ve fiyat farkı ile eklenirse miktar artar, satır çoğalmaz. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex(
    (l) =>
      l.productId === line.productId &&
      (l.customDescription || '') === (line.customDescription || '') &&
      (l.priceDifference || 0) === (line.priceDifference || 0)
  );
  if (i === -1) return [...lines, line];

  const next = [...lines];
  const existing = next[i]!;
  next[i] = { ...existing, quantity: existing.quantity + line.quantity };
  return next;
}

export function setQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
  customDescription?: string,
  priceDifference?: number
): CartLine[] {
  const match = (l: CartLine) =>
    l.productId === productId &&
    (l.customDescription || '') === (customDescription || '') &&
    (l.priceDifference || 0) === (priceDifference || 0);

  if (quantity <= 0) return lines.filter((l) => !match(l));
  return lines.map((l) => (match(l) ? { ...l, quantity } : l));
}

export function setRetailPrice(
  lines: CartLine[],
  productId: string,
  retailPrice: number | undefined,
  customDescription?: string,
  priceDifference?: number
): CartLine[] {
  const match = (l: CartLine) =>
    l.productId === productId &&
    (l.customDescription || '') === (customDescription || '') &&
    (l.priceDifference || 0) === (priceDifference || 0);

  return lines.map((l) => (match(l) ? { ...l, retailPrice } : l));
}

/** `place_order_atomic`'in beklediği yük. */
export function toOrderItems(lines: CartLine[]) {
  return lines.map((l) => ({
    product_id: l.productId,
    quantity: l.quantity,
    retail_unit_price: l.retailPrice ?? l.unitPrice,
    ...(l.customDescription ? { custom_description: l.customDescription } : {}),
    ...(l.priceDifference ? { price_difference: l.priceDifference } : {}),
  }));
}
