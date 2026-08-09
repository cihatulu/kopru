import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AcceptInviteFormView,
  AcceptSuccess,
  InviteError,
  isTerminalInviteError,
  useAcceptInvitation,
  useInvitePreview,
  type AcceptInviteForm,
  type AcceptResult,
} from '@/features/invitations';
import { ORG_KIND } from '@/constants';
import { Spinner } from '@/components/ui/Spinner';

/** Davet linki sayfası — oturum gerektirmez. YALNIZ KOMPOZİSYON (A20). */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const preview = useInvitePreview(token);
  const accept = useAcceptInvitation();
  const [result, setResult] = useState<AcceptResult | null>(null);

  const submit = (values: AcceptInviteForm) => {
    if (!token) return;
    accept.mutate(
      {
        token,
        vknTc: String(values.vknTc),
        companyName: String(values.companyName),
        password: String(values.password),
        ...(values.authorizedName ? { authorizedName: String(values.authorizedName) } : {}),
        ...(values.email ? { email: String(values.email) } : {}),
        ...(values.phone ? { phone: String(values.phone) } : {}),
      },
      { onSuccess: setResult },
    );
  };

  const previewError = preview.error instanceof InviteError ? preview.error : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        {preview.isPending && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {previewError && (
          <div className="space-y-3 text-center">
            <h2 className="text-lg font-bold text-slate-900">Davet açılamadı</h2>
            <p className="text-sm text-slate-600">{previewError.message}</p>
            {!isTerminalInviteError(previewError.code) && (
              <p className="text-xs text-slate-400">Kod: {previewError.code}</p>
            )}
          </div>
        )}

        {preview.data && result && (
          <AcceptSuccess result={result} inviterName={preview.data.inviterName} />
        )}

        {preview.data && !result && (
          <>
            <header className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                KÖPRÜ daveti
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                {preview.data.inviterName} sizi davet etti
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {preview.data.targetKind === ORG_KIND.retailer
                  ? 'Bayisi olarak sistemde yerinizi alın.'
                  : 'Tedarikçisi olarak sistemde yerinizi alın.'}{' '}
                Bilgilerinizi doldurup şifrenizi belirleyin; hesabınız hemen açılır.
              </p>
            </header>

            <AcceptInviteFormView
              preview={preview.data}
              pending={accept.isPending}
              errorMessage={accept.error instanceof InviteError ? accept.error.message : undefined}
              onSubmit={submit}
            />
          </>
        )}
      </div>
    </div>
  );
}
