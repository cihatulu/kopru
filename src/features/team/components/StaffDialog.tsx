import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { validateStaffForm, type StaffMember } from '../domain/staff';
import { StaffPasswordFields } from './StaffPasswordFields';
import { StaffScopePicker } from './StaffScopePicker';

const INPUT =
  'w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 focus:bg-white transition-colors text-slate-800 font-medium';
const LABEL = 'block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5';

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

    const message = validateStaffForm(formData, Boolean(staff));
    if (message) {
      setError(message);
      return;
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
          <div role="alert" className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Ad Soyad *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={pending}
              className={INPUT}
              required
            />
          </div>

          <div>
            <label className={LABEL}>Kullanıcı Kodu (Giriş ID)</label>
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

          <div className="md:col-span-2">
            <label className={LABEL}>E-posta</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={pending}
              className={INPUT}
            />
          </div>

          <div className="md:col-span-2">
            <label className={LABEL}>Telefon</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={pending}
              className={INPUT}
            />
          </div>
        </div>

        {!staff && (
          <StaffPasswordFields
            password={formData.password}
            passwordConfirm={formData.passwordConfirm}
            disabled={pending}
            onChange={(field, value) => {
              setFormData((prev) => ({ ...prev, [field]: value }));
              setError(null);
            }}
          />
        )}

        <StaffScopePicker
          retailers={retailers}
          selectedIds={formData.assignedRetailerIds}
          onToggle={toggleRetailer}
        />

        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1">
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
