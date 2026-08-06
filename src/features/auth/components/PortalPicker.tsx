import { PORTALS, type Portal } from '../domain/portals';

/**
 * Açılış ekranı: SADECE üç buton.
 *
 * Kullanıcının açık talebi — bir portala basılmadan o tarafın hiçbir alanı
 * gösterilmez. Bu yüzden burada input yoktur ve olmamalıdır.
 */
export function PortalPicker({ onSelect }: { onSelect: (portal: Portal) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hoş geldiniz</h1>
      <p className="mt-1.5 text-sm text-slate-500">Giriş yapmak için üyelik tipinizi seçin.</p>

      <div className="mt-8 space-y-3">
        {PORTALS.map((portal) => (
          <button
            key={portal.id}
            type="button"
            onClick={() => onSelect(portal.id)}
            className="group flex w-full items-center justify-between gap-4 rounded-xl bg-white
              p-4 text-left ring-1 ring-inset ring-slate-200 transition-colors
              hover:ring-brand-500 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">{portal.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {portal.subtitle}
              </span>
            </span>
            <svg
              className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
