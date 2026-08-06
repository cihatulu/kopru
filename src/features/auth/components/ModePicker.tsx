import { modesFor, portalTitle, type LoginMode, type Portal } from '../domain/portals';

interface Props {
  portal: Portal;
  onSelect: (mode: LoginMode) => void;
  onBack: () => void;
}

/**
 * Portal seçildikten sonra çıkan iki giriş yolu:
 *   · bizden hizmet alan (abone)
 *   · bizden hizmet almayan, karşı taraf tarafından eklenmiş (misafir)
 */
export function ModePicker({ portal, onSelect, onBack }: Props) {
  const modes = modesFor(portal);

  return (
    <div>
      <BackLink onClick={onBack} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {portalTitle(portal)}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">Nasıl giriş yapacaksınız?</p>

      <div className="mt-8 space-y-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className="flex w-full flex-col gap-1 rounded-xl bg-white p-4 text-left ring-1
              ring-inset ring-slate-200 transition-colors hover:ring-brand-500
              focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <span className="text-sm font-semibold text-slate-900">{mode.title}</span>
            <span className="text-xs leading-relaxed text-slate-500">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500
        hover:text-slate-900"
    >
      <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Geri
    </button>
  );
}
