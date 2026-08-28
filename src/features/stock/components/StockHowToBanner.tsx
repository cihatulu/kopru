import { useState } from 'react';

interface Props {
  isRetailer?: boolean;
}

/** Toplu stok güncellemenin dört adımı — Mobilde katlanabilir (accordion), masaüstünde açık. */
export function StockHowToBanner({ isRetailer = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5 text-left shadow-2xs transition-all">
      {/* Banner Başlık Satırı & Tıklanabilir Aç/Kapa Düğmesi */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 cursor-pointer select-none border-b border-blue-100/80 pb-2.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
            ℹ️
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 truncate">
              Stok Güncelleme Rehberi
            </h2>
            <p className="text-[11px] font-medium text-blue-700 sm:hidden truncate">
              4 Adımda Excel İle Toplu veya Hızlı Güncelleme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-700">
            4 Adımda Excel İle Toplu veya Tablodan Hızlı Güncelleme
          </span>

          {/* Açılır / Kapanır Ok Butonu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="flex size-7 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-100/60 transition-colors shadow-2xs"
            aria-label={open ? 'Rehberi Gizle' : 'Rehberi Göster'}
            title={open ? 'Rehberi Gizle' : 'Rehberi Göster'}
          >
            <svg
              className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Açıldığında Görünen İçerik (Mobilde ve Masaüstünde tıklandığında) */}
      {open && (
        <div className="pt-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Adım 1 */}
            <div className="rounded-xl border border-blue-200/60 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                    1
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">Şablon İndir</h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Şablon İndir</strong> butonuna basarak güncel listenizi Excel formatında bilgisayarınıza kaydedin.
                </p>
              </div>
            </div>

            {/* Adım 2 */}
            <div className="rounded-xl border border-blue-200/60 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                    2
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">Stokları Düzenle</h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Excel dosyasını açın ve yalnız <strong>stok</strong> sütunundaki adetleri güncelleyin.
                </p>
              </div>
            </div>

            {/* Adım 3 */}
            <div className="rounded-xl border border-blue-200/60 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                    3
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isRetailer ? 'Tedarikçiyi Gör' : 'Grupları Belirle'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isRetailer
                    ? 'Excel dosyasında her ürünün hangi üreticiye ait olduğu belirtilir.'
                    : 'Ürünleri gruplamak isterseniz Grup Adı sütununa ilgili grup adını yazın.'}
                </p>
              </div>
            </div>

            {/* Adım 4 */}
            <div className="rounded-xl border border-blue-200/60 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                    4
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">Dosyayı Yükle</h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Dosya Yükle</strong> ile geri yükleyin; önizleme ekranında kontrol edip tek tıkla onaylayın.
                </p>
              </div>
            </div>
          </div>

          {/* Bilgilendirme Notları */}
          <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {/* Manuel Stok Güncelleme */}
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-200/80 bg-blue-100/50 px-3.5 py-2.5 text-xs text-blue-950">
              <span className="text-base shrink-0">✍️</span>
              <p className="text-[11px] leading-relaxed text-blue-900">
                <strong className="font-extrabold text-blue-950">Manuel Stok Güncelleme:</strong> Tablodaki stok rakamına tıklayın, güncel stok rakamını yazın, sayfada herhangi bir yeri tıklayın ve ardından <strong>"Evet, Güncelle"</strong>ye basın.
              </p>
            </div>

            {/* Yeni Ürün Ekleme & DİKKAT Uyarısı */}
            {isRetailer ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
                <span className="text-base shrink-0">⚠️</span>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong className="font-extrabold text-amber-950">DİKKAT:</strong> Aktif ve ürün yönetimi izni olan bir üretici bağlı değilse perakendeci yeni ürün yükleyemez. Yeni ürün için Excel'de <strong>Ürün ID</strong> sütununu boş bırakın.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-blue-200/80 bg-blue-100/50 px-3.5 py-2.5 text-xs text-blue-950">
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0">💡</span>
                  <p className="text-[11px] leading-relaxed text-blue-900">
                    <strong className="font-extrabold text-blue-950">Yeni Ürün Ekleme:</strong> Excel'de yeni ürün için <strong>Ürün ID</strong> sütununu <strong>boş</strong> bırakın.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-900 bg-white/85 px-2 py-0.5 rounded-md border border-blue-200/70 shrink-0">
                  Pasif Ürünler'de açılır
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
