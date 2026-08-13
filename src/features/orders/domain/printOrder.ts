/**
 * Yazdırılabilir sipariş formu — SAF (A20), bağımsız bir HTML belgesi üretir.
 *
 * FİYAT: bu belge MÜŞTERİYE verilir, dolayısıyla yalnız perakendecinin kendi
 * satış fiyatlarını (KATMAN 3) taşır. Üreticiye ödenen tutar burada YER ALMAZ.
 */
import { formatMoney, formatDateTime } from '@/lib/format';
import { buildOrderReferenceCode } from './orderShare';

export interface PrintableOrderItem {
  name: string;
  customDescription?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PrintableOrder {
  retailerName: string;
  orderNo: string;
  createdAt: string;
  salespersonLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerProvince: string | null;
  customerDistrict: string | null;
  customerAddress: string | null;
  note: string | null;
  items: PrintableOrderItem[];
  total: number;
  paymentMethodLabel: string | null;
  paymentAmount: number | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Nakit',
  pos_own: 'Kredi Kartı (Bizim POS)',
  pos_manufacturer: 'Kredi Kartı (Üretici POS)',
};

export const paymentMethodLabel = (method: string): string => PAYMENT_LABELS[method] ?? method;

/** Kullanıcı metni HTML'e gömülüyor; kaçırılmazsa belge bozulur. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;white-space:nowrap;">${esc(label)}</td>` +
  `<td style="padding:4px 0;font-size:13px;font-weight:600;color:#111;">${esc(value)}</td></tr>`;

function customerRows(d: PrintableOrder): string {
  const location = [d.customerProvince, d.customerDistrict].filter(Boolean).join(' / ');
  return [
    d.customerName ? row('Müşteri', d.customerName) : '',
    d.customerPhone ? row('Telefon', d.customerPhone) : '',
    d.customerEmail ? row('E-posta', d.customerEmail) : '',
    location ? row('İl / İlçe', location) : '',
    d.customerAddress ? row('Adres', d.customerAddress) : '',
  ]
    .filter(Boolean)
    .join('');
}

function itemRows(items: PrintableOrderItem[]): string {
  return items
    .map(
      (i) => `<tr>
        <td style="padding:8px 8px 8px 0;border-bottom:1px solid #eee;">
          ${esc(i.name)}
          ${i.customDescription ? `<div style="font-size:11px;color:#666;margin-top:2px;">Değişiklik: ${esc(i.customDescription)}</div>` : ''}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(i.unitPrice)}</td>
        <td style="padding:8px 0 8px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatMoney(i.totalPrice)}</td>
      </tr>`,
    )
    .join('');
}

export function buildOrderPrintHtml(d: PrintableOrder): string {
  const ref = buildOrderReferenceCode(d.orderNo, d.createdAt);
  const customer = customerRows(d);

  const payment =
    d.paymentMethodLabel && d.paymentAmount
      ? `<table style="width:100%;margin-top:16px;border-collapse:collapse;">
          ${row('Ödeme Yöntemi', d.paymentMethodLabel)}
          ${row('Tahsil Edilen Tutar', formatMoney(d.paymentAmount))}
        </table>`
      : `<p style="font-size:13px;color:#666;margin-top:16px;">Bu siparişte henüz tahsilat alınmadı.</p>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Sipariş Formu — ${esc(ref)}</title>
<style>
  @media print { .no-print { display: none !important; } }
  body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
  .sheet { max-width: 700px; margin: 0 auto; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:16px;">
    <button onclick="window.print()" style="background:#111827;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;">Yazdır</button>
  </div>
  <div class="sheet">
    <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;">
      <h1 style="font-size:20px;margin:0;">${esc(d.retailerName)}</h1>
      <div style="text-align:right;">
        <div style="font-size:13px;color:#666;">${esc(formatDateTime(d.createdAt))}</div>
        <div style="font-size:13px;font-weight:600;">${esc(ref)}</div>
      </div>
    </div>

    ${d.salespersonLabel ? `<p style="font-size:13px;color:#666;margin:0 0 12px;">Satışçı: <strong>${esc(d.salespersonLabel)}</strong></p>` : ''}

    ${customer ? `<table style="width:100%;margin-bottom:16px;">${customer}</table>` : ''}

    <table style="width:100%;">
      <thead>
        <tr style="text-align:left;font-size:11px;text-transform:uppercase;color:#888;">
          <th style="padding:0 8px 8px 0;border-bottom:2px solid #111;">Ürün</th>
          <th style="padding:0 8px 8px;border-bottom:2px solid #111;text-align:center;">Adet</th>
          <th style="padding:0 8px 8px;border-bottom:2px solid #111;text-align:right;">Birim Fiyat</th>
          <th style="padding:0 0 8px 8px;border-bottom:2px solid #111;text-align:right;">Toplam</th>
        </tr>
      </thead>
      <tbody>${itemRows(d.items)}</tbody>
    </table>

    <table style="width:100%;margin-top:8px;">
      <tr>
        <td style="padding:8px 0;text-align:right;font-size:16px;font-weight:bold;border-top:2px solid #111;">Genel Toplam</td>
        <td style="padding:8px 0 8px 12px;text-align:right;font-size:16px;font-weight:bold;border-top:2px solid #111;width:140px;">${formatMoney(d.total)}</td>
      </tr>
    </table>

    ${payment}

    ${d.note ? `<p style="font-size:13px;color:#666;margin-top:16px;border-top:1px solid #eee;padding-top:12px;">Not: ${esc(d.note)}</p>` : ''}
  </div>
</body>
</html>`;
}
