import { formatDateTime } from '@/lib/format';
import { MAX_SSH_PER_ORDER } from '../domain/sshDraft';
import type { ServiceOrder } from '../api/useServiceOrders';

const CHIP = 'text-[10px] font-bold px-2 py-0.5 rounded-full border';

const ACCENT = {
  blue: {
    hover: 'hover:border-blue-400 hover:bg-blue-50/30',
    text: 'group-hover:text-blue-600',
    pill: 'group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600',
  },
  rose: {
    hover: 'hover:border-rose-400 hover:bg-rose-50/30',
    text: 'group-hover:text-rose-600',
    pill: 'group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500',
  },
} as const;

interface Props {
  order: ServiceOrder;
  accent: keyof typeof ACCENT;
  /** SSH kotası yalnız SSH akışında anlamlı; iadede gösterilmez. */
  showQuota: boolean;
  onSelect: (order: ServiceOrder) => void;
}

export function ServiceOrderCard({ order, accent, showQuota, onSelect }: Props) {
  const openBlocked = showQuota && order.openSshCount > 0;
  const limitBlocked = showQuota && order.totalSshCount >= MAX_SSH_PER_ORDER;
  const blocked = openBlocked || limitBlocked;
  const tone = ACCENT[accent];

  return (
    <button
      type="button"
      disabled={blocked}
      onClick={() => onSelect(order)}
      className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${
        blocked
          ? 'border-slate-200 bg-slate-50/70 opacity-80 cursor-not-allowed'
          : `border-slate-200 cursor-pointer group ${tone.hover}`
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-mono text-xs font-bold text-slate-900 ${tone.text}`}>
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
          {showQuota && !openBlocked && order.totalSshCount === 1 && (
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
              : `bg-white text-slate-700 border-slate-200 ${tone.pill}`
        }`}
      >
        {openBlocked
          ? 'Devam Eden Var'
          : limitBlocked
            ? `Limit Doldu (${MAX_SSH_PER_ORDER}/${MAX_SSH_PER_ORDER})`
            : 'Seç →'}
      </span>
    </button>
  );
}
