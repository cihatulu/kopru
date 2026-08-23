import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Draggable from 'react-draggable';

interface Props {
  /** Ekran okuyucular için pencerenin adı. */
  label: string;
  /** Panelin kendi sınıfları — genişlik, dolgu, kaydırma her pencerede farklı. */
  panelClassName?: string;
  /** Arka planın yerleşimi. Kenardan açılan paneller (drawer) için değişir. */
  backdropClassName?: string;
  /**
   * Kapatma engellenebilir.
   *
   * Kaydetme sürerken dışarı tıklamak pencereyi kapatmamalı: kullanıcı işlemin
   * olup olmadığını bilemeden ekrandan çıkmış olur.
   */
  closeDisabled?: boolean;
  /**
   * Kenarlardan sürükleyerek yeniden boyutlandırma.
   * Aktifken sol ve sağ kenarda ince bir tutamaç belirir.
   */
  resizable?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Tüm pencerelerin ortak kabuğu.
 *
 * Dışarı tıklayınca ve Esc'e basınca kapanır — ikisi birlikte beklenen
 * davranıştır; yalnız birini yapmak kullanıcıyı diğerini denemeye iter.
 *
 * Kapatma yalnız ARKA PLANIN KENDİSİNE tıklandığında olur (`e.target === e.currentTarget`).
 * Aksi halde panel içinde başlayıp dışarıda biten bir sürükleme — örneğin metin
 * seçerken fareyi dışarı taşımak — pencereyi kapatır ve yazılanı uçururdu.
 */
export function Modal({
  label,
  panelClassName,
  backdropClassName,
  closeDisabled,
  resizable,
  onClose,
  children,
}: Props) {
  const [width, setWidth] = useState<number | null>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const resizeState = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);
  const nodeRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (closeDisabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDisabled, onClose]);

  /** Sol veya sağ kenara mousedown — resize başlatır. */
  const startResize = useCallback(
    (side: 'left' | 'right') =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const currentWidth =
          panelRef.current?.getBoundingClientRect().width ?? 900;
        resizeState.current = { side, startX: e.clientX, startWidth: currentWidth };

        const onMove = (me: MouseEvent) => {
          if (!resizeState.current) return;
          const { side: s, startX, startWidth } = resizeState.current;
          const delta = me.clientX - startX;
          const newW = s === 'right' ? startWidth + delta : startWidth - delta;
          const clamped = Math.max(420, Math.min(window.innerWidth - 32, newW));
          setWidth(clamped);
        };

        const onUp = () => {
          resizeState.current = null;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
    [],
  );

  const handleStyle = [
    'absolute top-0 bottom-0 z-10 w-2 cursor-ew-resize',
    'bg-transparent hover:bg-blue-400/30 transition-colors',
    'cancel-drag', // Draggable'ın bunu sürükleme olarak saymaması için
  ].join(' ');

  return (
    <div
      className={
        backdropClassName ??
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'
      }
      onMouseDown={(e) => {
        if (!closeDisabled && e.target === e.currentTarget) onClose();
      }}
    >
      <Draggable
        nodeRef={nodeRef}
        cancel="input,textarea,button,select,option,a,[role='button'],.cancel-drag,.overflow-x-auto,table,thead,tbody,tr,th,td"
        bounds="parent"
      >
        <div
          ref={(el) => {
            // İki ref'i birleştir
            (nodeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          style={width ? { width, maxWidth: 'none' } : undefined}
          className={
            (panelClassName ??
              'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/80 text-left') +
            ' no-scrollbar cursor-move relative'
          }
        >
          {/* Kenar tutamaçları — yalnız resizable modallarda */}
          {resizable && (
            <>
              <div
                className={`${handleStyle} -left-1`}
                onMouseDown={startResize('left')}
              />
              <div
                className={`${handleStyle} -right-1`}
                onMouseDown={startResize('right')}
              />
            </>
          )}

          {/* İçerik etkileşimleri sırasında sürüklemeyi bozmamak için varsayılan cursor'u sıfırlayalım */}
          <div className="cursor-auto flex flex-col h-full min-h-0">
            {children}
          </div>
        </div>
      </Draggable>
    </div>
  );
}
