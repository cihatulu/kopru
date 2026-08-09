import type { ReactNode } from 'react';

interface Props {
  label: string;
  /** Grup kademesi büyük harf ve daha belirgin; kategori bir tık sönük. */
  emphasis?: boolean;
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children: ReactNode;
}

/**
 * Ağacın açılır bir dalı.
 *
 * Ok ile etiketin işi AYRI: ok yalnız açar/kapatır, etikete tıklamak listeyi
 * o dala göre daraltır. Tek tıkla ikisini birden yapsaydık kullanıcı içeriği
 * görmek isterken sayfayı değiştirmiş olurdu.
 */
export function TreeBranch({
  label,
  emphasis,
  expanded,
  active,
  onToggle,
  onSelect,
  children,
}: Props) {
  return (
    <li>
      <div className="flex items-center">
        <button
          type="button"
          aria-label={expanded ? `${label} dalını kapat` : `${label} dalını aç`}
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex size-5 shrink-0 items-center justify-center text-slate-500 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onSelect}
          className={`flex-1 truncate rounded px-1.5 py-1 text-left transition-colors ${
            emphasis
              ? 'text-[11px] font-semibold uppercase tracking-wide'
              : 'text-[11px] font-medium'
          } ${active ? 'text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {label}
        </button>
      </div>

      {expanded && (
        <ul className="ml-5 space-y-0.5 border-l border-slate-700/60 pl-2">{children}</ul>
      )}
    </li>
  );
}
