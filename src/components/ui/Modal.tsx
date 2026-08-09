import { useEffect, type ReactNode } from 'react';

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
  onClose,
  children,
}: Props) {
  useEffect(() => {
    if (closeDisabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDisabled, onClose]);

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
      <div role="dialog" aria-modal="true" aria-label={label} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}
