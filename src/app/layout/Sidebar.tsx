import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { NavItem } from './navigation';

interface Props {
  items: NavItem[];
  companyName: string;
  open: boolean;
  onClose: () => void;
  /**
   * Menü maddelerinin sayaç rozetleri, `badgeKey` ile eşlenir.
   *
   * Eskiden rozet `item.label === 'Duyurular'` diye ETİKETE bakıyordu:
   * başlık değişse rozet sessizce kaybolurdu ve ikinci bir sayaç eklemek
   * mümkün değildi. Şimdi menü hangi rozeti taşıyacağını kendi bildiriyor,
   * değeri buradan geliyor.
   */
  // `| undefined` açıkça yazılır: exactOptionalPropertyTypes açıkken sorgu
  // henüz dönmemişken gelen `undefined` ile "hiç verilmedi" ayrı tiplerdir.
  badges?: Partial<Record<NonNullable<NavItem['badgeKey']>, number | undefined>>;
  /**
   * Menü maddelerinin altına yerleştirilecek dinamik içerik.
   *
   * Layout veri çekmez (A20); ağaç gibi içerikler ilgili feature'da üretilir
   * ve buraya hazır düğüm olarak verilir.
   */
  slots?: Partial<Record<NonNullable<NavItem['slot']>, ReactNode>>;
}

/** Menü maddesinin sağ ucundaki sayaç. Sıfır ve tanımsız hiç çizilmez. */
function NavBadge({ count }: { count: number | undefined }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full
        bg-red-600 px-1.5 text-[11px] font-bold tabular-nums text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Koyu sol menü. Mobilde kayarak açılır, masaüstünde sabittir. */
export function Sidebar({ items, companyName, open, onClose, badges, slots }: Props) {
  const location = useLocation();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-slate-900/50 md:hidden"
        />
      )}

      {/*
        Masaüstünde `md:h-screen md:sticky` ZORUNLU.
        Önceki `h-full` + `md:relative` yazımında koyu panel menü maddeleri
        bitince kesiliyordu: `height: 100%`, yüksekliği `auto` olan bir
        kapsayıcıya karşı çözülür ve içerik boyuna düşer — flex'in `stretch`
        davranışını da ezer. Ekran yüksekliğine bağlamak hem paneli tam
        doldurur hem uzun sayfalarda menüyü görünür tutar.
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-screen w-64 shrink-0 flex-col bg-slate-900 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-4 py-5 shrink-0">
          <div className="rounded-xl bg-white px-4 py-4 text-center">
            <span className="block truncate text-base font-extrabold tracking-tight text-slate-900">
              {companyName}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {items.map((item) => {
            const isEnd = item.to.split('/').length === 2;
            const isItemActive = isEnd 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);

            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  end={isEnd}
                  onClick={onClose}
                  className={({ isActive }) =>
                    /*
                      Aktif madde MARKA rengiyle işaretlenir. Eskiden gri bir
                      tondu (`bg-slate-700/80`) ve hover ile neredeyse aynı
                      görünüyordu — kullanıcı hangi sayfada olduğunu menüden
                      okuyamıyordu. Marka tokenına bağlı olduğu için org kendi
                      rengini verdiğinde menü de onunla döner.
                    */
                    `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-600 font-semibold text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                  <span className="truncate">{item.label}</span>
                  <NavBadge count={item.badgeKey ? badges?.[item.badgeKey] : undefined} />
                </NavLink>

                {/* Dinamik içerik (ör. katalog ağacı) sadece ilgili menü aktifken çizilir. */}
                {item.slot && isItemActive && slots?.[item.slot]}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
