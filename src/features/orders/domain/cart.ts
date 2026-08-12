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
  name: string;
  code: string;
  imageUrl?: string | undefined;
  model?: string | undefined;
  /** İskonto uygulanmış taban birim alış fiyatı. */
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
  /** Üreticiye ödenecek toplam — cari bu tutardan işler. */
  supplierTotal: number;
  /** Perakendecinin beklenen cirosu; yalnız kendisi görür. */
  retailTotal: number | null;
  /** Beklenen kâr. Satırlardan biri bile fiyatsızsa null. */
  expectedProfit: number | null;
  lineCount: number;
  /** Toplam adet (parça sayısı). */
  itemCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(line: CartLine): number {
  const effectivePrice = line.unitPrice + (line.priceDifference || 0);
  return round2(effectivePrice * line.quantity);
}

export function cartTotals(lines: CartLine[]): CartTotals {
  const supplierTotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  // Tek bir satırın satış fiyatı bile eksikse ciro/kâr "kısmen doğru" olur —
  // yanıltıcı bir sayı göstermektense hiç göstermemek doğrusu.
  const allPriced = lines.length > 0 && lines.every((l) => l.retailPrice !== undefined);
  const retailTotal = allPriced
    ? round2(lines.reduce((sum, l) => sum + ((l.retailPrice ?? 0) + (l.priceDifference || 0)) * l.quantity, 0))
    : null;

  return {
    supplierTotal,
    retailTotal,
    expectedProfit: retailTotal === null ? null : round2(retailTotal - supplierTotal),
    lineCount: lines.length,
    itemCount,
  };
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
