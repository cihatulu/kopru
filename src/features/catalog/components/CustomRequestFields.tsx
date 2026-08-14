import { formatMoney } from '@/lib/format';

interface Props {
  description: string;
  onDescriptionChange: (v: string) => void;
  /** Boş dizge = kullanıcı henüz bir şey yazmadı; 0 ile aynı şey değil. */
  difference: number | '';
  onDifferenceChange: (v: number | '') => void;
  /** İskontolu üretici fiyatı — farkın üzerine bindiği taban. */
  basePrice: number;
}

const INPUT =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all outline-none';

/**
 * Müşteri değişiklik talebi ve fiyat farkı.
 *
 * FARK İKİ YÖNLÜ ÇALIŞIR: "kumaş kadife olsun" üretim maliyetini artırır (artı),
 * "kırlent istemiyoruz" azaltır (eksi). Alan bunu söylemiyordu; kullanıcı yalnız
 * "0" görüyor ve eksi yazılabileceğini bilmiyordu.
 *
 * Tutar ÜRETİCİYE aittir: işi üretici yapar, ücreti/indirimi üretici verir ve
 * cariye o yazılır (KATMAN 2).
 */
export function CustomRequestFields({
  description,
  onDescriptionChange,
  difference,
  onDifferenceChange,
  basePrice,
}: Props) {
  const diff = Number(difference) || 0;
  const final = basePrice + diff;

  return (
    <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        MÜŞTERİ DEĞİŞİKLİK TALEBİ
      </h4>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
            AÇIKLAMA / DEĞİŞİKLİK TALEBİ
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Örn: Kumaş kadife olsun, kırlent istemiyoruz vb."
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
            FİYAT FARKI (₺)
          </label>
          <input
            type="number"
            step="any"
            value={difference}
            onChange={(e) => {
              const val = e.target.value;
              onDifferenceChange(val === '' ? '' : Number(val));
            }}
            placeholder="0"
            className={`${INPUT} font-mono`}
          />
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            Maliyeti artıran talep için <span className="font-semibold">artı</span> (kadife kumaş:
            2000), azaltan talep için <span className="font-semibold">eksi</span> yazın (kırlent
            çıksın: -500). Bu tutar üreticiye ödenir; cari hesabınıza yansır.
          </p>
        </div>
      </div>

      {(description.trim() || diff !== 0) && (
        <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
          <div>
            <p className="font-extrabold text-slate-400 uppercase text-[9px]">Nihai Birim Fiyat</p>
            {description && (
              <p className="text-slate-600 font-semibold truncate max-w-[180px]">
                Talep: {description}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-black text-indigo-600 text-base">{formatMoney(final)}</span>
            {diff !== 0 && (
              <span
                className={`block text-[10px] font-semibold ${diff > 0 ? 'text-slate-500' : 'text-emerald-600'}`}
              >
                {diff > 0 ? 'Ek ücret' : 'İndirim'}: {diff > 0 ? '+' : ''}
                {formatMoney(diff)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
