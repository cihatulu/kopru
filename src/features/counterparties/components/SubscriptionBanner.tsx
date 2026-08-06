import { Button } from '@/components/ui/Button';

interface Props {
  pending: boolean;
  requested: boolean;
  onRequest: () => void;
}

/**
 * Misafir organizasyonun kendi paneline geçiş çağrısı (PLAN §5).
 *
 * Vurgulanan şey önemli: yükseltme mevcut ilişkileri BOZMAZ. Misafir zaten
 * grafın içinde gerçek bir düğüm olduğu için veri taşınmaz.
 */
export function SubscriptionBanner({ pending, requested, onRequest }: Props) {
  return (
    <section className="rounded-xl bg-brand-50 p-5 ring-1 ring-inset ring-brand-100">
      <h3 className="text-sm font-semibold text-brand-900">Kendi panelinizi açın</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-900/80">
        Şu anda sizi ekleyen firmanın müşterisi olarak sistemi kullanıyorsunuz. Abone
        olduğunuzda kendi katalogunuzu, stoğunuzu ve kendi müşterilerinizi yönetebilirsiniz —{' '}
        <strong>mevcut ticari ilişkileriniz ve geçmişiniz aynen korunur.</strong>
      </p>

      <div className="mt-4">
        {requested ? (
          <p className="text-xs font-medium text-brand-800">
            Talebiniz alındı, inceleniyor. Onaylandığında giriş bilgileriniz iletilecek.
          </p>
        ) : (
          <Button loading={pending} onClick={onRequest}>
            Abonelik talebi gönder
          </Button>
        )}
      </div>
    </section>
  );
}
