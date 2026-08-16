import type { ReactNode } from 'react';

/*
  TEK SAYAÇ KARTI KABUĞU.

  Uygulamada beş ayrı sayaç kartı tasarımı vardı: gösterge paneli pastel
  degrade, siparişler beyaz + renkli rakam, SSH degrade + büyüyen ikon,
  raporlar yatay ikon+metin, cari dolu renkli kutu. Aynı işi yapan bu
  kartlar farklı yükseklikte, farklı başlık ölçüsünde ve farklı ikon
  boyutundaydı — panel değiştikçe ürün başka bir ürün gibi görünüyordu.

  Kabuk buradan gelir; RENK çağrı yerinde kalır çünkü rengin anlamı
  (bekleyen / tamamlanan / iptal) o bağlamda bilinir.
*/
export const STAT_SURFACE =
  'flex min-w-0 flex-col rounded-2xl border bg-white p-4 text-left shadow-xs';

/** Seçilebilir olmayan kartların kenarlığı. */
export const STAT_BORDER = 'border-slate-200';

interface Props {
  label: string;
  value: string | number;
  /** Rakamın altındaki tek satır açıklama. */
  hint?: ReactNode;
  /** İkon kutusunun zemin + ikon rengi, ör. `bg-amber-50 text-amber-600`. */
  iconClass?: string;
  /** Rakamın rengi. Varsayılan koyu. */
  valueClass?: string;
  /** SVG `path` içeriği; viewBox ve stroke ayarları burada verilir. */
  icon: ReactNode;
}

/**
 * SIFIR DEĞER SÖNÜK ÇİZİLİR.
 *
 * "Bekleyen sipariş: 0" kartını kehribara boyamak yanlış alarm üretir —
 * ortada yapılacak iş yokken kart dikkat çeker. Kural kartın kendisinde
 * durur, yoksa gösterge panelinde uygulanıp SSH ekranında unutuluyordu:
 * aynı "0 bekliyor" bilgisi bir ekranda gri, diğerinde kehribardı.
 */
const IDLE_ICON = 'bg-slate-100 text-slate-400';
const IDLE_VALUE = 'text-slate-400';

/** "0", "₺0,00", "%0,0" — hiç sıfırdan farklı rakam içermiyorsa sönük. */
const isZero = (v: string | number) => !/[1-9]/.test(String(v));

/**
 * Kartın iç düzeni.
 *
 * Ayrı bileşen: sipariş sayaçları aynı zamanda süzgeç olduğu için `div`
 * değil `button` olmak zorunda. Kabuk sınıfı `STAT_SURFACE` ile, içerik
 * bununla paylaşılır.
 */
export function StatCardContent({
  label,
  value,
  hint,
  iconClass = 'bg-slate-100 text-slate-500',
  valueClass = 'text-slate-900',
  icon,
}: Props) {
  const idle = isZero(value);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 pt-0.5 text-[11px] font-bold uppercase leading-tight tracking-wider text-slate-500">
          {label}
        </span>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            idle ? IDLE_ICON : iconClass
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
      </div>

      <span
        className={`mt-2 truncate text-2xl font-bold tabular-nums tracking-tight ${
          idle ? IDLE_VALUE : valueClass
        }`}
      >
        {value}
      </span>

      {hint !== undefined && (
        <span className="mt-2 truncate text-[11px] text-slate-500">{hint}</span>
      )}
    </>
  );
}

/** Tıklanmayan sayaç kartı. */
export function StatCard(props: Props) {
  return (
    <div className={`${STAT_SURFACE} ${STAT_BORDER}`}>
      <StatCardContent {...props} />
    </div>
  );
}
