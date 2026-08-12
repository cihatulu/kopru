interface Props {
  fullName: string;
  /** Personelin giriş ekranında kullanacağı kod — org'un VKN/TCKN'si. */
  vkn: string;
  password?: string | undefined;
  onClose: () => void;
}

const LABEL = 'block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5';
const VALUE = 'text-sm font-mono text-slate-800';

export function StaffCreatedDialog({ fullName, vkn, password, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 text-left border border-slate-100/80">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-100 text-lg">
          🎉
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Personel Başarıyla Eklendi</h3>
        <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed">
          <strong>{fullName}</strong> isimli personeliniz için hesap başarıyla oluşturuldu.
          Personelinizin giriş yaparken kullanacağı kimlik bilgileri aşağıdadır:
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3.5 mb-6 shadow-inner">
          <div>
            <span className={LABEL}>Kullanıcı Kodu (VKN)</span>
            <strong className={VALUE}>{vkn}</strong>
          </div>
          <div>
            <span className={LABEL}>Şifre</span>
            <strong className={VALUE}>{password}</strong>
          </div>
          <div className="pt-2.5 border-t border-slate-200">
            <span className="block text-[10px] text-amber-700 font-extrabold italic">
              ℹ️ Personeliniz giriş yaparken &quot;Personel Girişi&quot; seçeneğini işaretlemelidir.
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 text-xs cursor-pointer shadow-md"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
