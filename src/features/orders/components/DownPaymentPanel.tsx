import type { PaymentMethod } from '../api/useCheckoutForm';

const FIELD =
  'w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

interface Props {
  disabled: boolean;
  method: PaymentMethod;
  amount: string;
  onMethodChange: (method: PaymentMethod) => void;
  onAmountChange: (amount: string) => void;
}

/**
 * Sipariş anında alınan peşinat.
 *
 * `pos_manufacturer` seçilirse para perakendecinin kasasına HİÇ girmez;
 * doğrudan üreticiye gider ve cari borcu azaltır (A4).
 */
export function DownPaymentPanel({ disabled, method, amount, onMethodChange, onAmountChange }: Props) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-200 ${
        disabled
          ? 'opacity-50 grayscale pointer-events-none border-slate-100 bg-slate-50/50'
          : 'border-brand-100 bg-brand-50/10'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-150 bg-slate-50/40">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          PEŞİNAT / İLK TAHSİLAT GİRİŞİ
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label htmlFor="cart-payment-method" className={LABEL}>
            ÖDEME YÖNTEMİ
          </label>
          <select
            id="cart-payment-method"
            value={method}
            onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
            className={FIELD}
          >
            <option value="cash">Nakit (Kasa Hesabına Geçer)</option>
            <option value="pos_own">Kredi Kartı - Bizim POS (Banka Hesabına)</option>
            <option value="pos_manufacturer">Kredi Kartı - Üretici POS (Üretici Carisinden Düşer)</option>
          </select>
        </div>

        <div>
          <label htmlFor="cart-payment-amount" className={LABEL}>
            TAHSİL EDİLEN TUTAR (TL)
          </label>
          <input
            id="cart-payment-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Örn: 5000"
            className={FIELD}
          />
        </div>
      </div>
    </div>
  );
}
