import type { CustomerFields } from '../domain/checkout';

const FIELD =
  'w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all';
const LABEL = 'flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5';
const OPT = <span className="text-slate-300 font-normal">(Opsiyonel)</span>;

interface Props {
  values: CustomerFields;
  /** Misafir perakendecide adres ve iletişim alanları toplanmaz. */
  isSubscriber: boolean;
  allowNoPayment: boolean;
  marketingConsent: boolean;
  onChange: (key: keyof CustomerFields, value: string) => void;
  onAllowNoPaymentChange: (value: boolean) => void;
  onMarketingConsentChange: (value: boolean) => void;
}

/** Son kullanıcı bilgileri ve sipariş notu. */
export function CheckoutFields({
  values,
  isSubscriber,
  allowNoPayment,
  marketingConsent,
  onChange,
  onAllowNoPaymentChange,
  onMarketingConsentChange,
}: Props) {
  const text = (key: keyof CustomerFields, label: string, placeholder: string, hint?: string) => (
    <div>
      <label htmlFor={`cart-${key}`} className={LABEL}>
        {label} {OPT}
      </label>
      <input
        id={`cart-${key}`}
        type="text"
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className={FIELD}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-purple-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Sipariş Bilgileri
        </span>
      </div>

      <div className="p-5 space-y-4">
        {text('name', 'Müşteri Adı', 'Örn. Ahmet Yılmaz')}

        {isSubscriber && (
          <>
            {text(
              'phone',
              'Müşteri Cep Telefonu',
              '0xxxxxxxxx',
              'Numara girilirse, sipariş sonrası müşteriye WhatsApp ile takip linki gönderilir.',
            )}
            {text('email', 'Müşteri E-posta', 'Örn: ahmet@example.com')}
            {text('province', 'İl', 'Örn: İstanbul')}
            {text('district', 'İlçe', 'Örn: Kadıköy')}

            <div>
              <label htmlFor="cart-address" className={LABEL}>
                Açık Adres {OPT}
              </label>
              <textarea
                id="cart-address"
                value={values.address}
                onChange={(e) => onChange('address', e.target.value)}
                placeholder="Mahalle, sokak, bina no..."
                rows={2}
                className={`${FIELD} resize-none`}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="cart-note" className={LABEL}>
            Sipariş Açıklaması / Notu {OPT}
          </label>
          <textarea
            id="cart-note"
            value={values.note}
            onChange={(e) => onChange('note', e.target.value)}
            placeholder="Sevkiyat detayları, teslimat notları..."
            rows={2}
            className={`${FIELD} resize-none`}
          />
        </div>

        {isSubscriber && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowNoPayment}
                onChange={(e) => onAllowNoPaymentChange(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4"
              />
              Şu an tahsilat almadan siparişi tamamlamak istiyorum.
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => onMarketingConsentChange(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4"
              />
              Kampanya e-postalarını almak istiyorum.
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
