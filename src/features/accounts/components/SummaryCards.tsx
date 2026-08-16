import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatMoney } from '@/lib/format';
import { isSummaryConsistent, type LedgerSummary } from '../domain/period';

interface Props {
  summary: LedgerSummary;
  /** Dönem seçili mi — değilse "devir" yerine "başlangıç" demek daha doğru. */
  periodActive: boolean;
  isManufacturer: boolean;
}

/**
 * Dönem özeti: devir, borç, alacak, kapanış.
 *
 * Dört sayı birlikte bir mutabakat tablosudur; ayrı ayrı gösterilmeleri
 * anlamsız olurdu. Tutarsızlık varsa (kapanış ≠ devir + borç − alacak)
 * kullanıcı UYARILIR — yanlış bir toplamla mutabakat yapmaktansa bilmek iyidir.
 */
export function SummaryCards({ summary, periodActive, isManufacturer }: Props) {
  const consistent = isSummaryConsistent(summary);

  const debitValue = isManufacturer ? summary.totalCredit : summary.totalDebit;
  const creditValue = isManufacturer ? summary.totalDebit : summary.totalCredit;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label={periodActive ? 'Devir bakiye' : 'Başlangıç'}
          value={formatMoney(summary.openingBalance)}
          tone="neutral"
        />
        <Card label="Toplam borç" value={formatMoney(debitValue)} tone="debit" />
        <Card label="Toplam alacak" value={formatMoney(creditValue)} tone="credit" />
        <Card
          label="Kapanış bakiye"
          value={formatMoney(summary.closingBalance)}
          hint={isManufacturer ? 'Pozitif = müşteriniz borçlu' : 'Pozitif = borçlusunuz'}
          tone="strong"
        />
      </div>

      <p className="text-xs text-slate-400">Dönemde {summary.entryCount} hareket.</p>

      {!consistent && (
        <ErrorAlert>
          Özet tutarlı değil: kapanış bakiyesi, devir + borç − alacak sonucuna eşit değil. Bu
          ekrandaki toplamları mutabakat için kullanmayın.
        </ErrorAlert>
      )}
    </div>
  );
}

/*
  Dolu renk burada KORUNDU: bu dört kutu bir mutabakat satırıdır, tek tek
  sayaç değil. Borç ile alacağı zeminden ayırmak, dört sayıyı bir arada
  okurken hangisinin hangisi olduğunu anında veriyor.

  Değişen: `rose` → `red`. Uygulamada olumsuz durum için iki ayrı kırmızı
  kullanılıyordu; artık tek kırmızı var.
*/
const TONE: Record<string, string> = {
  neutral: 'bg-white text-slate-900 ring-slate-200',
  debit: 'bg-red-50 text-red-800 ring-red-200',
  credit: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  /** Kapanış bakiyesi — sonucun kendisi, bu yüzden koyu. */
  strong: 'bg-slate-900 text-white ring-slate-900',
};

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  const strong = tone === 'strong';
  return (
    <div className={`rounded-xl p-4 ring-1 ring-inset ${TONE[tone]}`}>
      <p className={`text-xs font-semibold ${strong ? 'text-slate-300' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {hint && (
        <p className={`mt-0.5 text-xs ${strong ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</p>
      )}
    </div>
  );
}
