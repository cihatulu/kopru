import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { StaffMember } from '../domain/staff';

interface Props {
  staff?: StaffMember | null;
  retailers: { id: string; name: string }[];
  vkn: string;
  initialScope?: string[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {
    fullName: string;
    userCode: string;
    email: string;
    phone: string;
    password?: string;
    assignedRetailerIds: string[];
  }) => void;
}

export function StaffDialog({ staff, retailers, vkn, initialScope, pending, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState({
    fullName: staff?.fullName || '',
    userCode: staff?.userCode || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    password: '',
    passwordConfirm: '',
    assignedRetailerIds: initialScope || ([] as string[]),
  });

  const [error, setError] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [userCodeCapsLock, setUserCodeCapsLock] = useState(false);

  useEffect(() => {
    if (initialScope) {
      setFormData((prev) => ({ ...prev, assignedRetailerIds: initialScope }));
    }
  }, [initialScope]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const toggleRetailer = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedRetailerIds: prev.assignedRetailerIds.includes(id)
        ? prev.assignedRetailerIds.filter((rid) => rid !== id)
        : [...prev.assignedRetailerIds, id],
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError('Ad Soyad alanı zorunludur.');
      return;
    }

    if (staff) {
      if (!formData.userCode.trim()) {
        setError('Kullanıcı Kodu alanı zorunludur.');
        return;
      }
      if (formData.userCode.length < 3 || formData.userCode.length > 20) {
        setError('Kullanıcı kodu en az 3 ve en fazla 20 karakter olmalıdır.');
        return;
      }
      if (/^\d+$/.test(formData.userCode)) {
        setError('Kullanıcı kodu sadece rakamlardan oluşamaz, en az bir harf içermelidir.');
        return;
      }
      if (/[^a-z0-9]/.test(formData.userCode)) {
        setError('Kullanıcı kodu sadece İngilizce küçük harf ve rakam içerebilir.');
        return;
      }
    }

    if (!staff) {
      if (!formData.password || formData.password !== formData.passwordConfirm) {
        setError('Şifreler uyuşmuyor veya boş bırakılamaz.');
        return;
      }
      if (
        formData.password.length < 6 ||
        !/[a-zA-Z]/.test(formData.password) ||
        !/\d/.test(formData.password)
      ) {
        setError('Şifre en az 6 karakter, en az bir harf ve bir rakam içermelidir.');
        return;
      }
    }

    onSubmit({
      fullName: formData.fullName.trim(),
      userCode: staff ? formData.userCode.trim().toLowerCase() : '',
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      ...(staff ? {} : { password: formData.password }),
      assignedRetailerIds: formData.assignedRetailerIds,
    });
  };

  return (
    <Modal
      label={staff ? 'Personel Düzenle' : 'Yeni Personel Oluştur'}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/80 text-left"
      onClose={onClose}
      closeDisabled={pending}
    >
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="text-sm font-bold text-slate-800">
          {staff ? `Personel Düzenle: ${staff.fullName}` : 'Yeni Personel Oluştur'}
        </h3>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6" autoComplete="off">
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100 shadow-sm animate-pulse">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ad Soyad */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Ad Soyad *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={pending}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
              required
            />
          </div>

          {/* Kullanıcı Kodu (Giriş ID) */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Kullanıcı Kodu (Giriş ID)
            </label>
            <input
              type="text"
              value={vkn}
              disabled
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-400 font-mono font-bold bg-slate-100 cursor-not-allowed"
            />
            <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400 font-bold italic">
              Personelinizin giriş kodu firmaya ait VKN'dir ve değiştirilemez.
            </p>
          </div>

          {/* E-posta */}
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={pending}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
            />
          </div>

          {/* Telefon */}
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Telefon
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={pending}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
            />
          </div>
        </div>

        {/* Şifre Alanları (Sadece Personel Ekleme Aşamasında) */}
        {!staff && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Şifre *
              </label>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                value={formData.password}
                disabled={pending}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value.replace(/[A-Z]/g, '') })
                }
                onKeyUp={(e) =>
                  setCapsLockOn(e.getModifierState('CapsLock') || e.getModifierState('Shift'))
                }
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
                required
              />
              {capsLockOn && (
                <p className="mt-1 text-[10px] text-yellow-600 font-bold">
                  ⚠️ Büyük harf kilidi açık — büyük harf kullanamazsınız.
                </p>
              )}
              <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400 font-medium">
                En az 6 karakter, en az bir harf ve bir rakam içermelidir. Noktalama işaretleri kullanılabilir.
              </p>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Şifre Tekrar *
              </label>
              <input
                type="password"
                name="passwordConfirm"
                autoComplete="new-password"
                value={formData.passwordConfirm}
                disabled={pending}
                onChange={(e) =>
                  setFormData({ ...formData, passwordConfirm: e.target.value.replace(/[A-Z]/g, '') })
                }
                onKeyUp={(e) =>
                  setCapsLockOn(e.getModifierState('CapsLock') || e.getModifierState('Shift'))
                }
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium"
                required
              />
            </div>
          </div>
        )}

        {/* Sorumlu Olduğu Bayiler (Scope Seçimi) */}
        <div className="border-t border-slate-100 pt-5">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
            <span>Sorumlu Olduğu Bayiler</span>
            <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 font-extrabold px-3 py-1 rounded-full shadow-sm">
              {formData.assignedRetailerIds.length} Bayi Seçildi
            </span>
          </h4>
          <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-200/60 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 shadow-inner">
            {retailers.map((retailer) => {
              const isChecked = formData.assignedRetailerIds.includes(retailer.id);
              return (
                <div
                  key={retailer.id}
                  onClick={() => toggleRetailer(retailer.id)}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-blue-50/80 border-blue-200 shadow-sm ring-1 ring-blue-300'
                      : 'bg-white border-slate-100 hover:border-slate-350 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="h-4.5 w-4.5 text-slate-800 rounded border-slate-300 focus:ring-slate-800 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-850 truncate">
                      {retailer.name}
                    </p>
                  </div>
                </div>
              );
            })}
            {retailers.length === 0 && (
              <p className="col-span-2 text-center text-xs text-slate-400 py-8 italic font-semibold">
                Tanımlı bayiniz bulunmuyor.
              </p>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 font-bold italic">
            * Personeliniz sadece burada seçtiğiniz bayilerin işlemlerini görebilecektir.
          </p>
        </div>

        {/* Footer Butonları */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" loading={pending}>
            {staff ? 'Kaydet' : 'Personel Ekle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
