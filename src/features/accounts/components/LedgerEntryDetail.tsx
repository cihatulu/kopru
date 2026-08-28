import { formatMoney } from '@/lib/format';
import type { LedgerEntry, LedgerItemSnapshot } from '../domain/ledgerEntry';

/**
 * Ekstre satırının açılan detayı.
 *
 * Kalemler siparişin ANINDAKİ hâliyle `items_snapshot` içinde donmuştur;
 * ürünün bugünkü fiyatı değişse de burada değişmez (A8).
 */
function ItemLine({ item }: { item: LedgerItemSnapshot }) {
  const diff = item.priceDifference;
  const unitTotal = (item.unitPrice ?? 0) + (diff ?? 0);

  return (
    <li className="text-slate-800 font-medium">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">•</span>
        <span>{item.name}</span>
        {item.code && <span className="font-mono text-slate-400">({item.code})</span>}
        <span className="font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded text-[11px]">
          x{item.quantity}
        </span>
        {item.unitPrice !== undefined && item.unitPrice > 0 && (
          <span className="text-slate-600 text-[11px] ml-auto font-mono font-semibold">
            {diff ? (
              <>
                <span className="text-slate-400">{formatMoney(item.unitPrice)}</span>
                <span className={diff > 0 ? 'text-amber-600 ml-1' : 'text-emerald-600 ml-1'}>
                  ({diff > 0 ? '+' : ''}{formatMoney(diff)}) =
                </span>{' '}
              </>
            ) : null}
            {formatMoney(unitTotal)} / Adet
          </span>
        )}
      </div>

      {item.customDescription && (
        <p className="ml-4 mt-0.5 text-[11px] font-semibold text-amber-800">
          Talep: {item.customDescription}
        </p>
      )}

      {/* Ek ücret ayrı yazılır: "bu tutar neden bu kadar" sorusu burada yanıtlanır. */}
      {diff !== undefined && diff !== 0 && (
        <p className="ml-4 mt-0.5 text-[11px] font-mono text-slate-500">
          {diff > 0 ? 'Özel talep farkı' : 'İndirim'}: {diff > 0 ? '+' : ''}
          {formatMoney(diff)} / Adet
        </p>
      )}
    </li>
  );
}

export function LedgerEntryDetail({ entry }: { entry: LedgerEntry }) {
  const items = entry.itemsSnapshot;

  return (
    <div className="space-y-2.5 text-xs">
      <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
        <span>•</span> İŞLEM DETAYLARI
      </h5>

      {items && items.length > 0 ? (
        <ul className="space-y-1.5 pl-1">
          {items.map((item, idx) => (
            <ItemLine key={idx} item={item} />
          ))}
        </ul>
      ) : (
        <div className="bg-white/60 p-2.5 rounded-lg border border-slate-200 space-y-1">
          {/* Sipariş no yalnız KENDİ siparişinde okunabilir: perakendeci
              tahsilatı başka üreticinin carisinden düşebilir ve o sipariş
              RLS gereği burada görünmez. Bilgi açıklamada taşınır. */}
          {entry.orderNo && (
            <p className="font-mono font-semibold text-slate-700">Sipariş #{entry.orderNo}</p>
          )}
          <p className="text-slate-600">{entry.description}</p>
          <p className="italic text-slate-400">
            Bu işlem için kaydedilmiş ürün kalemi bulunmuyor.
          </p>
        </div>
      )}
    </div>
  );
}
