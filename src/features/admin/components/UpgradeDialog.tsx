import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  SUBDOMAIN_MESSAGES,
  normalizeSubdomain,
  suggestSubdomain,
  validateSubdomain,
} from '../domain/subdomain';
import type { AdminOrg } from '../api/useOrgList';
import type { UpgradeResult } from '../api/useOrgMutations';

interface Props {
  org: AdminOrg;
  pending: boolean;
  result: UpgradeResult | null;
  onClose: () => void;
  onConfirm: (subdomain: string) => void;
}

/**
 * Tek tık aboneye yükseltme.
 *
 * Kullanıcıya açıkça söylenen şey önemli: mevcut ticari ilişkiler ve geçmiş
 * KORUNUR. Bu, köprüsüz mimarinin doğrudan sonucu — misafir zaten grafın içinde.
 */
export function UpgradeDialog({ org, pending, result, onClose, onConfirm }: Props) {
  const [subdomain, setSubdomain] = useState(() => suggestSubdomain(org.companyName));
  const [touched, setTouched] = useState(false);

  const error = validateSubdomain(subdomain);
  const showError = touched && error;

  return (
    <Modal
      label={'Üyeliğe yükselt'}
      panelClassName={'w-full max-w-md rounded-xl bg-white p-6 shadow-xl'}
      onClose={onClose}
      closeDisabled={pending}
    >
      {result ? (
        <UpgradeSuccess org={org} result={result} onClose={onClose} />
      ) : (
        <>
          <h2 className="text-lg font-bold text-slate-900">Üyeliğe yükselt</h2>
          <p className="mt-1 text-sm text-slate-500">
            {org.companyName} · {org.vknTc}
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="subdomain">
                Subdomain
              </label>
              <input
                id="subdomain"
                className="input"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                onBlur={() => setTouched(true)}
              />
              {showError && <p className="field-error">{SUBDOMAIN_MESSAGES[error]}</p>}
            </div>

            {org.relationshipCount > 0 && (
              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
                Bu organizasyonun <strong>{org.relationshipCount} aktif ticari ilişkisi</strong>{' '}
                var. Yükseltme bunlara dokunmaz — sipariş geçmişi ve cari bakiyeler olduğu gibi
                kalır, kendi paneli buna ek olarak açılır.
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button
              loading={pending}
              disabled={!!error}
              onClick={() => {
                setTouched(true);
                if (!error) onConfirm(normalizeSubdomain(subdomain));
              }}
            >
              Yükselt
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function UpgradeSuccess({
  org,
  result,
  onClose,
}: {
  org: AdminOrg;
  result: UpgradeResult;
  onClose: () => void;
}) {
  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">Yükseltme tamamlandı</h2>
      <p className="mt-1 text-sm text-slate-500">{org.companyName} artık üye.</p>

      {result.tempPassword ? (
        <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-medium text-amber-900">
            Giriş bilgileri — bu şifre bir daha gösterilmeyecek.
          </p>
          <dl className="mt-3 space-y-1.5 font-mono text-sm text-amber-950">
            <div className="flex justify-between gap-4">
              <dt>Kullanıcı kodu</dt>
              <dd className="font-semibold">{result.userCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Geçici şifre</dt>
              <dd className="font-semibold">{result.tempPassword}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          {result.ownerCreated === false && result.userCode
            ? `Bu organizasyonun girişi zaten vardı (kullanıcı kodu: ${result.userCode}).`
            : 'Yükseltme yapıldı; owner hesabı ayrıca açılmalı.'}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Kapat</Button>
      </div>
    </>
  );
}
