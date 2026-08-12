/** Rapor ekranının veri şekilleri — SAF (A20). */

export interface ReportProduct {
  id: string;
  name: string;
  code: string;
  category: string | null;
  images: string[];
}

export interface ReportOrderItem {
  productId: string | null;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReportOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  retailerOrgId: string;
  retailerName: string;
  items: ReportOrderItem[];
}

export interface ReportSsh {
  id: string;
  productId: string | null;
  status: string;
  createdAt: string;
  orderId: string | null;
}

export interface ManufacturerReportsData {
  products: ReportProduct[];
  /** Ürün maliyeti YALNIZ üreticiye görünür; ayrı tablodan gelir (A4). */
  costs: Map<string, number>;
  orders: ReportOrder[];
  sshRequests: ReportSsh[];
}

/**
 * Ciro ve kâr hesabına giren siparişler.
 *
 * İptal ve iade edilenler HER hesabın dışında: ciroya da, kâra da, ürün
 * sıralamasına da girmezler — ayrı raporları var.
 */
export const isRevenueOrder = (o: { status: string }): boolean =>
  o.status !== 'cancelled' && o.status !== 'returned';
