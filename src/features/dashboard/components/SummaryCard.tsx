import { StatCard } from '@/components/ui/StatCard';

/*
  RENK ARTIK ANLAM TAŞIYOR.

  Önce sekiz dekoratif ton vardı (blue, purple, pink, teal…) ve her kart
  pastel degrade bir zeminle çiziliyordu. "Toplam Ürün" mavi, "Toplam
  Müşteri" mordu — bu renklerin hiçbiri bir şey söylemiyordu, dolayısıyla
  kullanıcı hangi kartın dikkat istediğini renkten okuyamıyor, dokuz kartı
  tek tek okumak zorunda kalıyordu.

  Şimdi zemin her kartta aynı beyaz yüzey. Renk yalnız DURUMU bildirir ve
  yalnız ikon ile rakamda görünür.
*/
export type CardTone = 'neutral' | 'attention' | 'positive' | 'negative';

const TONES: Record<CardTone, { icon: string; value: string }> = {
  /** Sayım. İyi ya da kötü değil — sadece bilgi. */
  neutral: { icon: 'bg-slate-100 text-slate-500', value: 'text-slate-900' },
  /** İşlem bekliyor. Sıfırdan büyükse kullanıcının yapacağı bir iş var. */
  attention: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' },
  /** Tamamlanmış, kazanılmış. */
  positive: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
  /** İade, borç, iptal — aleyhte olan tutar. */
  negative: { icon: 'bg-red-50 text-red-600', value: 'text-red-700' },
};

interface Props {
  title: string;
  value: string;
  /** Sayının ne anlama geldiğini söyleyen tek satır. */
  hint: string;
  icon: string;
  tone: CardTone;
}

export function SummaryCard({ title, value, hint, icon, tone }: Props) {
  // Sıfır değerin sönük çizilmesi `StatCard`'ın işi — kural orada, tek
  // yerde durur. Burada yalnız anlam → renk eşlemesi var.
  const t = TONES[tone];

  return (
    <StatCard
      label={title}
      value={value}
      hint={hint}
      iconClass={t.icon}
      valueClass={t.value}
      icon={<path d={icon} />}
    />
  );
}
