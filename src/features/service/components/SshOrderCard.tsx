import { formatDateTime } from '@/lib/format';
import { MAX_SSH_PER_ORDER } from '../domain/sshDraft';
import type { SshEligibleOrder } from '../api/useSshEligibleOrders';

const CHIP = 'text-[10px] font-bold px-2 py-0.5 rounded-full border';

interface Props {
  order: SshEligibleOrder;
  onSelect: (order: SshEligibleOrder) => void;
}

/** Adım 1'deki tek sipariş satırı; kota durumu rozetle anlatılır. */
export function SshOrderCard({ order, onSelect }: Props) {
  const openBlocked = order.openSshCount > 0;
  const limitBlocked = order.totalSshCount >= MAX_SSH_PER_ORDER;
  const blocked = openBlocked || limitBlocked;

  return (
    <button
      type="button"
      disabled={blocked}
      onClick={() => onSelect(order)}
      className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${
        blocked
          ? 'border-slate-200 bg-slate-50/70 opacity-80 cursor-not-allowed'
          : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer group'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600">
            #{order.orderNo}
          </span>
          <span className="text-xs text-slate-500">· {order.manufacturerName}</span>

          {openBlocked && (
            <span className={`${CHIP} bg-amber-100 text-amber-800 border-amber-200`}>
              ⏳ Devam Eden SSH Talebi Var
            </span>
          )}
          {!openBlocked && limitBlocked && (
            <span className={`${CHIP} bg-rose-100 text-rose-800 border-rose-200`}>
              🚫 Max SSH Limitine Ulaşıldı ({MAX_SSH_PER_ORDER}/{MAX_SSH_PER_ORDER})
            </span>
          )}
          {!openBlocked && order.totalSshCount === 1 && (
            <span className={`${CHIP} bg-blue-50 text-blue-700 border-blue-200`}>
              ℹ️ 1/{MAX_SSH_PER_ORDER} Talep Kullanıldı
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>

        <div className="flex flex-wrap gap-1 mt-1">
          {order.items.map((item) => (
            <span key={item.id} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {item.name} ({item.quantity} Adet)
            </span>
          ))}
        </div>
      </div>

      {/* Kartın kendisi düğme; içeride ikinci bir <button> olamaz. */}
      <span
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold ${
          openBlocked
            ? 'opacity-60 bg-amber-50 text-amber-700 border-amber-200'
            : limitBlocked
              ? 'opacity-60 bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-white text-slate-700 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
        }`}
      >
        {openBlocked ? 'Devam Eden Var' : limitBlocked ? `Limit Doldu (${MAX_SSH_PER_ORDER}/${MAX_SSH_PER_ORDER})` : 'Seç →'}
      </span>
    </button>
  );
}
