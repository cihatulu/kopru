import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthSession } from '@/features/auth';
import {
  computeReturnCreditsByOrder,
  buildChildrenByParent,
  reconstructRootOrderDebt,
  type FinanceKind,
  type PaymentMethod,
  type FinanceTotals,
} from '../domain/finance';

export interface FinanceTransaction {
  id: string;
  retailer_id: string;
  type: FinanceKind;
  method: PaymentMethod;
  amount: number;
  description: string | null;
  order_id: string | null;
  manufacturer_id: string | null;
  created_at: string;
  order?: { customer_name: string | null; manufacturer?: { company_name: string | null } | null } | null;
  manufacturer?: { company_name: string | null } | null;
}

export interface FinanceStats {
  cash_balance: number;
  total_cash_income: number;
  total_cash_expense: number;
  total_pos_own: number;
  total_pos_manufacturer: number;
}

export interface CustomerLedger {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_province?: string | null;
  customer_district?: string | null;
  customer_address?: string | null;
  total_order_amount: number;
  total_paid_amount: number;
  remaining_balance: number;
  order_ids: string[];
  manufacturer_names?: string[];
}

export interface MinimalOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  parentOrderId: string | null;
  totalAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  manufacturerName: string | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useFinanceTransactions() {
  const { data: user } = useAuthSession();
  return useQuery<FinanceTransaction[]>({
    queryKey: ['finance_transactions', user?.org?.id],
    queryFn: async () => {
      if (!user?.org?.id) return [];
      const { data, error } = await supabase
        .from('finance_entries')
        .select(`
          id,
          retailer_org_id,
          kind,
          method,
          amount,
          description,
          order_id,
          manufacturer_org_id,
          created_at,
          order:orders(customer_name, manufacturer:organizations(company_name)),
          manufacturer:organizations(company_name)
        `)
        .eq('retailer_org_id', user.org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id,
        retailer_id: t.retailer_org_id,
        type: t.kind,
        method: t.method,
        amount: Number(t.amount),
        description: t.description,
        order_id: t.order_id,
        manufacturer_id: t.manufacturer_org_id,
        created_at: t.created_at,
        order: t.order,
        manufacturer: t.manufacturer,
      }));
    },
    enabled: !!user?.org?.id,
  });
}

export function useAllOrders() {
  const { data: user } = useAuthSession();
  return useQuery<MinimalOrder[]>({
    queryKey: ['orders', 'all-finance', user?.org?.id],
    queryFn: async () => {
      if (!user?.org?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          created_at,
          parent_order_id,
          total_amount,
          customer_name,
          customer_phone,
          customer_address,
          manufacturer:organizations(company_name)
        `)
        .eq('retailer_org_id', user.org.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        id: o.id,
        orderNo: o.order_no,
        createdAt: o.created_at,
        parentOrderId: o.parent_order_id,
        totalAmount: Number(o.total_amount),
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        manufacturerName: o.manufacturer?.company_name || null,
      }));
    },
    enabled: !!user?.org?.id,
  });
}

export function useManufacturers() {
  const { data: user } = useAuthSession();
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['finance', 'manufacturers', user?.org?.id],
    queryFn: async () => {
      if (!user?.org?.id) return [];
      const { data, error } = await supabase
        .from('relationships')
        .select(`
          manufacturer_org_id,
          manufacturer:organizations!relationships_manufacturer_org_id_manufacturer_kind_fkey(id, company_name)
        `)
        .eq('retailer_org_id', user.org.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.manufacturer?.id || r.manufacturer_org_id,
        name: r.manufacturer?.company_name || 'Bilinmeyen Üretici',
      }));
    },
    enabled: !!user?.org?.id,
  });
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function useFinanceStats() {
  const { data: transactions } = useFinanceTransactions();

  if (!transactions) {
    return {
      cash_balance: 0,
      total_cash_income: 0,
      total_cash_expense: 0,
      total_pos_own: 0,
      total_pos_manufacturer: 0,
    } as FinanceStats;
  }

  return transactions.reduce(
    (acc, t) => {
      const amt = Number(t.amount);
      if (t.method === 'cash') {
        if (t.type === 'income') {
          acc.total_cash_income += amt;
          acc.cash_balance += amt;
        } else {
          acc.total_cash_expense += amt;
          acc.cash_balance -= amt;
        }
      } else if (t.method === 'pos_own') {
        if (t.type === 'income') {
          acc.total_pos_own += amt;
        } else if (t.type === 'expense') {
          acc.total_pos_own -= amt;
        }
      } else if (t.method === 'pos_manufacturer') {
        if (t.type === 'income') {
          acc.total_pos_manufacturer += amt;
        } else if (t.type === 'expense') {
          acc.total_pos_manufacturer -= amt;
        }
      }
      return acc;
    },
    {
      cash_balance: 0,
      total_cash_income: 0,
      total_cash_expense: 0,
      total_pos_own: 0,
      total_pos_manufacturer: 0,
    }
  );
}

// ─── Customer Ledgers ────────────────────────────────────────────────────────

export function useCustomerLedgers(orders: MinimalOrder[] | undefined) {
  const { data: transactions } = useFinanceTransactions();

  if (!orders || !transactions) return [];

  const returnCreditsByOrder = computeReturnCreditsByOrder(transactions);
  const childrenByParent = buildChildrenByParent(orders);

  const ledgerMap = new Map<string, CustomerLedger>();

  orders.forEach((o) => {
    if (!o.customerName && !o.customerPhone) return;

    const cName = (o.customerName || 'İsimsiz').trim();
    const cPhone = (o.customerPhone || '').trim();
    const key = `${cName}-${cPhone}`;

    if (!ledgerMap.has(key)) {
      ledgerMap.set(key, {
        customer_name: cName,
        customer_phone: cPhone,
        customer_email: null,
        customer_province: null,
        customer_district: null,
        customer_address: o.customerAddress,
        total_order_amount: 0,
        total_paid_amount: 0,
        remaining_balance: 0,
        order_ids: [],
        manufacturer_names: [],
      });
    }

    const entry = ledgerMap.get(key)!;
    entry.order_ids.push(o.id);
    if (o.manufacturerName && !entry.manufacturer_names!.includes(o.manufacturerName)) {
      entry.manufacturer_names!.push(o.manufacturerName);
    }

    if (!o.parentOrderId) {
      const totalAmount = reconstructRootOrderDebt(o, childrenByParent, returnCreditsByOrder);
      entry.total_order_amount += totalAmount;
      entry.remaining_balance += totalAmount;
    }
  });

  transactions.forEach((t) => {
    if (t.order_id) {
      const order = orders.find((o) => o.id === t.order_id);
      if (order) {
        const cName = (order.customerName || 'İsimsiz').trim();
        const cPhone = (order.customerPhone || '').trim();
        const key = `${cName}-${cPhone}`;
        const entry = ledgerMap.get(key);
        if (entry) {
          const amt = Number(t.amount);
          if (t.type === 'income') {
            entry.total_paid_amount += amt;
            entry.remaining_balance -= amt;
          } else if (t.type === 'expense') {
            entry.total_order_amount += amt;
            entry.remaining_balance += amt;
          }
        }
      }
    }
  });

  return Array.from(ledgerMap.values()).sort((a, b) => b.remaining_balance - a.remaining_balance);
}

// ─── Mutations ───────────────────────────────────────────────────────────────

interface AddTransactionArgs {
  type: FinanceKind;
  method: PaymentMethod;
  amount: number;
  description: string;
  order_id?: string;
  manufacturer_id?: string;
}

export function useAddFinanceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: AddTransactionArgs) => {
      const { data, error } = await supabase.rpc('add_finance_transaction', {
        p_type: args.type,
        p_method: args.method,
        p_amount: args.amount,
        p_description: args.description,
        p_order_id: args.order_id || null,
        p_manufacturer_id: args.manufacturer_id || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance_transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
