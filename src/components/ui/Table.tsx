import type { ReactNode } from 'react';

/*
  TEK TABLO DİLİ.

  Tarama: 20 ayrı dosya kendi `TH` sabitini tanımlamıştı — `px-4 py-2.5
  font-semibold` ile `px-6 py-4 font-black uppercase tracking-wider` aynı
  uygulamada yan yana duruyordu. ERP'de en çok bakılan yüzey tablodur;
  tutarsızlık en çok burada göze batıyordu.

  Sınıf dizileri sabit olarak DIŞA VERİLİR, çünkü mevcut tablolar kendi
  `<thead>`/`<tbody>` yapılarını kuruyor ve hepsini tek bir generic
  bileşene taşımak bu turun kapsamı değil. Sabiti import etmek, satırı
  elle yazmaya göre hem kısa hem kaymaya kapalı.
*/

/** Başlık hücresi — sola dayalı varsayılan. */
export const TH =
  'px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';

/** Sayı sütunu başlığı: rakam sağa dayanır ki basamaklar hizalansın. */
export const TH_NUM = `${TH} text-right`;
export const TH_CENTER = `${TH} text-center`;

/** Gövde hücresi. */
export const TD = 'px-4 py-3 text-sm text-slate-700 align-middle';
export const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;
export const TD_CENTER = `${TD} text-center whitespace-nowrap`;

/** Birincil tanımlayıcı sütun (ürün adı, firma adı) — koyu ve kalın. */
export const TD_STRONG = `${TD} font-semibold text-slate-900`;

/** Kod/VKN/sipariş no gibi eşleştirme alanları monospace okunur. */
export const TD_CODE = `${TD} font-mono text-xs text-slate-500 whitespace-nowrap`;

/** Başlık şeridi zemini — tablo kaydırılırken sütun adı kaybolmaz. */
export const THEAD = 'border-b border-slate-200 bg-slate-50';

/** Satır ayracı + hover. Satır tıklanabilirse `cursor-pointer` ekle. */
export const TBODY = 'divide-y divide-slate-100';
export const TR = 'transition-colors hover:bg-slate-50/70';

/** Kart içinde kenardan kenara akan tablo için yatay kaydırma kabı. */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

interface EmptyProps {
  /** Tablodaki sütun sayısı — satır tabloyu tam kaplasın diye gerekli. */
  colSpan: number;
  children: ReactNode;
}

/**
 * "Kayıt yok" satırı.
 *
 * Her tablo bunu kendi ölçüleriyle yazıyordu ve `colSpan` sütun eklenince
 * güncellenmeyi unutuluyordu; boş mesaj tablonun ortasına değil soluna
 * yapışık çıkıyordu.
 */
export function TableEmpty({ colSpan, children }: EmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-400">
        {children}
      </td>
    </tr>
  );
}
