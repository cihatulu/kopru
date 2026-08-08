/**
 * Ürün varyantları ve set içeriği — SAF (A20).
 *
 * Varyant FİYATI ETKİLEMEZ. Seçenekler yalnız siparişte hangi değerin
 * seçildiğini kaydetmek içindir; fiyat farkı gerekiyorsa ayrı ürün açılır.
 * Bu bilinçli: varyant başına fiyat, üç fiyat katmanının (A4) her birini
 * varyant sayısı kadar çoğaltır ve cari mutabakatını kırılganlaştırır.
 */

export interface Variant {
  name: string;
  options: string[];
}

export interface SetLine {
  productId: string;
  quantity: number;
}

export interface Dimensions {
  width?: number | undefined;
  depth?: number | undefined;
  height?: number | undefined;
}

/** Boş adı veya seçeneği olmayan varyantlar kaydedilmez. */
export function cleanVariants(variants: Variant[]): Variant[] {
  return variants
    .map((v) => ({
      name: v.name.trim(),
      options: v.options.map((o) => o.trim()).filter(Boolean),
    }))
    .filter((v) => v.name.length > 0 && v.options.length > 0);
}

export function addVariant(variants: Variant[]): Variant[] {
  return [...variants, { name: '', options: [''] }];
}

export function updateVariantName(variants: Variant[], index: number, name: string): Variant[] {
  return variants.map((v, i) => (i === index ? { ...v, name } : v));
}

export function updateVariantOption(
  variants: Variant[],
  index: number,
  optionIndex: number,
  value: string,
): Variant[] {
  return variants.map((v, i) =>
    i === index ? { ...v, options: v.options.map((o, j) => (j === optionIndex ? value : o)) } : v,
  );
}

export function addVariantOption(variants: Variant[], index: number): Variant[] {
  return variants.map((v, i) => (i === index ? { ...v, options: [...v.options, ''] } : v));
}

export function removeVariant(variants: Variant[], index: number): Variant[] {
  return variants.filter((_, i) => i !== index);
}

/** Seçeneksiz kalacaksa satırın tamamı silinir — boş varyant anlamsızdır. */
export function removeVariantOption(
  variants: Variant[],
  index: number,
  optionIndex: number,
): Variant[] {
  return variants
    .map((v, i) => (i === index ? { ...v, options: v.options.filter((_, j) => j !== optionIndex) } : v))
    .filter((v) => v.options.length > 0);
}

/** Aynı ürün ikinci kez eklenirse adet artar, satır çoğalmaz. */
export function addSetLine(lines: SetLine[], productId: string): SetLine[] {
  const i = lines.findIndex((l) => l.productId === productId);
  if (i === -1) return [...lines, { productId, quantity: 1 }];
  const next = [...lines];
  next[i] = { ...next[i]!, quantity: next[i]!.quantity + 1 };
  return next;
}

export function setLineQuantity(lines: SetLine[], productId: string, quantity: number): SetLine[] {
  if (quantity <= 0) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity } : l));
}

/** Bir ürün kendi setinin içinde olamaz — sonsuz döngü demektir. */
export function canAddToSet(productId: string, editingProductId: string | undefined): boolean {
  return productId !== editingProductId;
}

/** Boyutları okunabilir tek satıra çevirir. */
export function formatDimensions(d: Dimensions): string | null {
  const parts = [d.width, d.depth, d.height];
  if (parts.every((p) => p === undefined || p === null)) return null;
  return `${parts.map((p) => (p == null ? '—' : p)).join(' × ')} cm`;
}
