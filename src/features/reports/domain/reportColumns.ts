/** Detay raporlarının kolonları — SAF (A20). Tablo ve CSV AYNI tanımdan çıkar. */
import { formatMoney } from '@/lib/format';
import type { CountedProductRow, CustomerRow, ProductRow, SshRow } from './reportAggregates';

export type ReportKind =
  | 'customers'
  | 'products'
  | 'ssh'
  | 'cancelled_products'
  | 'returned_products';

export type Align = 'left' | 'center' | 'right';

export interface DetailCell {
  /** CSV'ye giden ham değer; tabloda `text` gösterilir. */
  raw: string | number;
  text: string;
  align: Align;
  badge?: string;
}

export interface DetailRow {
  key: string;
  category: string | null;
  /** Sıralama ölçütü — kolon başına ayrı sıralama yok, tek anlamlı metrik var. */
  metric: number;
  title: string;
  subtitle: string;
  cells: DetailCell[];
}

export interface DetailReport {
  title: string;
  fileName: string;
  /** CSV başlıkları — model/kategori ayrı kolonlardır. */
  headers: string[];
  /** Tablo başlıkları — model, ürün adının altında gösterildiği için ayrı değil. */
  tableHeaders: string[];
  rows: DetailRow[];
  /** Ürün kolonu olmayan raporda kategori süzgeci gösterilmez. */
  hasCategory: boolean;
}

const num = (v: number, align: Align = 'center'): DetailCell => ({ raw: v, text: String(v), align });
const money = (v: number): DetailCell => ({ raw: v, text: formatMoney(v), align: 'right' });

export interface ReportSources {
  customers: CustomerRow[];
  products: ProductRow[];
  ssh: SshRow[];
  cancelled: CountedProductRow[];
  returned: CountedProductRow[];
}

export function buildDetailReport(kind: ReportKind, src: ReportSources): DetailReport {
  if (kind === 'customers') {
    return {
      title: 'Müşteri Satış Performans Raporu',
      fileName: 'musteri_satis_raporu.csv',
      headers: ['Müşteri Adı', 'Sipariş Sayısı', 'Toplam Ciro'],
      tableHeaders: ['Müşteri', 'Sipariş Sayısı', 'Toplam Ciro'],
      hasCategory: false,
      rows: src.customers.map((r) => ({
        key: r.id,
        category: null,
        metric: r.totalAmount,
        title: r.companyName,
        subtitle: '',
        cells: [num(r.orderCount), money(r.totalAmount)],
      })),
    };
  }

  if (kind === 'products') {
    return {
      title: 'Ürün Analizi (En Çok Satan Ürünler)',
      fileName: 'urun_satis_karlilik_raporu.csv',
      headers: ['Ürün Adı', 'Model', 'Kategori', 'Satılan Adet', 'Ciro', 'Tahmini Kâr'],
      tableHeaders: ['Ürün', 'Kategori', 'Satılan Adet', 'Toplam Ciro', 'Tahmini Kâr'],
      hasCategory: true,
      rows: src.products.map((r) => ({
        key: r.id,
        category: r.product.category,
        metric: r.quantity,
        title: r.product.name,
        subtitle: r.product.code,
        cells: [num(r.quantity), money(r.revenue), money(r.profit)],
      })),
    };
  }

  if (kind === 'ssh') {
    return {
      title: 'Arıza (SSH) Yoğunluk Raporu',
      fileName: 'ssh_ariza_analiz_raporu.csv',
      headers: ['Ürün Adı', 'Model', 'Kategori', 'Arıza Bildirim Sayısı'],
      tableHeaders: ['Ürün', 'Kategori', 'SSH Bildirim Adedi'],
      hasCategory: true,
      rows: src.ssh.map((r) => ({
        key: r.id,
        category: r.product.category,
        metric: r.count,
        title: r.product.name,
        subtitle: r.product.code,
        cells: [
          { raw: r.count, text: String(r.count), align: 'center', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
        ],
      })),
    };
  }

  const isCancelled = kind === 'cancelled_products';
  const rows = isCancelled ? src.cancelled : src.returned;

  return {
    title: isCancelled ? 'Ürün İptal Analizi' : 'Ürün İade Analizi',
    fileName: isCancelled ? 'urun_iptal_raporu.csv' : 'urun_iade_raporu.csv',
    headers: ['Ürün Adı', 'Model', 'Kategori', isCancelled ? 'İptal Edilen Adet' : 'İade Edilen Adet'],
    tableHeaders: ['Ürün', 'Kategori', 'Adet'],
    hasCategory: true,
    rows: rows.map((r) => ({
      key: r.id,
      category: r.product.category,
      metric: r.quantity,
      title: r.product.name,
      subtitle: r.product.code,
      cells: [
        {
          raw: r.quantity,
          text: String(r.quantity),
          align: 'center',
          badge: isCancelled
            ? 'bg-slate-100 text-slate-700 border-slate-200'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        },
      ],
    })),
  };
}

/** CSV satırları: ürün kolonları başta, sonra tanımlı hücreler. */
export function toCsvRows(report: DetailReport, rows: DetailRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.title,
    ...(report.hasCategory ? [r.subtitle || '—', r.category ?? '—'] : []),
    ...r.cells.map((c) => c.raw),
  ]);
}
