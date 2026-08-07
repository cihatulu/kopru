import { Button } from '@/components/ui/Button';

interface Props {
  companyName: string;
  userCode: string;
  tempPassword: string;
  onClose: () => void;
}

/**
 * Yeni giriş bilgilerini BİR KEZ gösterir.
 *
 * Şifre hiçbir yere kaydedilmez — ne veritabanına, ne log'a, ne de bu bileşenin
 * durumunun dışına. Pencere kapandığında geri getirmenin tek yolu yeniden
 * yenilemektir. Bu bilinçli: saklanan bir şifre er ya da geç sızar.
 */
export function CredentialsDialog({ companyName, userCode, tempPassword, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Yeni giriş bilgileri"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">Yeni giriş bilgileri</h2>
        <p className="mt-1 text-sm text-slate-500">{companyName}</p>

        <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-medium text-amber-900">
            Bu şifre bir daha gösterilmeyecek. Kullanıcıya iletmeden pencereyi kapatmayın.
          </p>
          <dl className="mt-3 space-y-1.5 font-mono text-sm text-amber-950">
            <div className="flex justify-between gap-4">
              <dt>Kullanıcı kodu</dt>
              <dd className="font-semibold">{userCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Yeni şifre</dt>
              <dd className="font-semibold">{tempPassword}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Kullanıcı bu bilgilerle giriş yaptıktan sonra şifresini kendisi değiştirebilir.
        </p>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </div>
  );
}
