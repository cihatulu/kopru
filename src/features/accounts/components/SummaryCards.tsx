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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label={periodActive ? 'Devir bakiye' : 'Başlangıç'}
          value={formatMoney(summary.openingBalance)}
          tone="neutral"
        />
        <Card label="Toplam borç" value={formatMoney(summary.totalDebit)} tone="debit" />
        <Card label="Toplam alacak" value={formatMoney(summary.totalCredit)} tone="credit" />
        <Card
          label="Kapanış bakiye"
          value={formatMoney(summary.closingBalance)}
          hint={isManufacturer ? 'Pozitif = müşteriniz borçlu' : 'Pozitif = borçlusunuz'}
          tone="strong"
        />
      </div>

      <p className="text-xs text-slate-400">Dönemde {summary.entryCount} hareket.</p>

      {!consistent && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Özet tutarlı değil: kapanış bakiyesi, devir + borç − alacak sonucuna eşit değil. Bu
          ekrandaki toplamları mutabakat için kullanmayın.
        </p>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  neutral: 'bg-white text-slate-900 ring-slate-200',
  debit: 'bg-rose-50 text-rose-900 ring-rose-200',
  credit: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
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
