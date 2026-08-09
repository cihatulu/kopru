import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { ORG_KIND, type OrgKind } from '@/constants';
import {
  addCounterpartySchema,
  isSelfReference,
  type AddCounterpartyForm,
} from '../domain/addSchema';
import type { AddCounterpartyResult } from '../api/useCounterpartyMutations';

interface Props {
  myKind: OrgKind;
  myVknTc: string;
  pending: boolean;
  result: AddCounterpartyResult | null;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: AddCounterpartyForm) => void;
}

export function AddCounterpartyDialog(props: Props) {
  const { myKind, myVknTc, pending, result, errorMessage, onClose, onSubmit } = props;
  const noun = myKind === ORG_KIND.manufacturer ? 'Perakendeci' : 'Üretici';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddCounterpartyForm>({ resolver: zodResolver(addCounterpartySchema) });

  const submit = (values: AddCounterpartyForm) => {
    if (isSelfReference(values.vknTc, myVknTc)) {
      setError('vknTc', { message: 'Kendi vergi numaranızı ekleyemezsiniz.' });
      return;
    }
    onSubmit(values);
  };

  return (
    <Modal
      label={`${noun} ekle`}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      onClose={onClose}
      closeDisabled={pending}
    >
      {result ? (
        <AddResult result={result} noun={noun} onClose={onClose} />
      ) : (
        <>
          <h2 className="text-lg font-bold text-slate-900">{noun} ekle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Vergi numarası yeterli. Firma sistemde kayıtlıysa mevcut kaydına bağlanılır, değilse
            sizin adınıza açılır.
          </p>

          <form onSubmit={(e) => void handleSubmit(submit)(e)} className="mt-5 space-y-4">
            <Field label="VKN / T.C. No" error={errors.vknTc?.message}>
              <input id="vknTc" inputMode="numeric" className="input" {...register('vknTc')} />
            </Field>

            <Field label="Firma adı (isteğe bağlı)" error={errors.companyName?.message}>
              <input id="companyName" className="input" {...register('companyName')} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon" error={errors.phone?.message}>
                <input id="phone" className="input" {...register('phone')} />
              </Field>
              <Field label="E-posta" error={errors.email?.message}>
                <input id="email" className="input" {...register('email')} />
              </Field>
            </div>

            {myKind === ORG_KIND.manufacturer && (
              <Field label="İskonto oranı (%)" error={errors.discountRate?.message}>
                <input
                  id="discountRate"
                  type="number"
                  step="0.01"
                  className="input"
                  defaultValue={0}
                  {...register('discountRate')}
                />
              </Field>
            )}

            {errorMessage && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button type="submit" loading={pending}>
                Ekle
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Üç sonuç da farklı anlama gelir; kullanıcı hangisi olduğunu bilmeli. */
function AddResult({
  result,
  noun,
  onClose,
}: {
  result: AddCounterpartyResult;
  noun: string;
  onClose: () => void;
}) {
  const message = result.alreadyExisted
    ? `Bu firma zaten listenizde. Durumu: ${result.status === 'active' ? 'aktif' : result.status === 'pending' ? 'onay bekliyor' : 'pasif'}.`
    : result.status === 'pending'
      ? `Bu ${noun.toLowerCase()} de platformun abonesi olduğu için bağlantı isteği gönderildi. Onayladığında ilişki aktifleşecek.`
      : result.orgCreated
        ? `${noun} kaydı sizin adınıza açıldı ve listenize eklendi.`
        : `Firma sistemde kayıtlıydı; mevcut kaydına bağlanıldı — kopya kayıt açılmadı.`;

  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">
        {result.alreadyExisted ? 'Zaten ekli' : 'Eklendi'}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Kapat</Button>
      </div>
    </>
  );
}
