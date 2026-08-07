import type { OrgKind, Plan } from '@/constants';
import { CreateOrgDialog } from './CreateOrgDialog';
import { CredentialsDialog } from './CredentialsDialog';
import { UpgradeDialog } from './UpgradeDialog';
import type { CreateOrgForm } from '../domain/orgSchema';
import type { AdminOrg } from '../api/useOrgList';
import type { UpgradeResult } from '../api/useOrgMutations';
import type { ResetPasswordResult } from '../api/useResetPassword';

interface Props {
  kind: OrgKind;

  creating: boolean;
  createPending: boolean;
  createFailed: boolean;
  onCreateClose: () => void;
  onCreateSubmit: (v: CreateOrgForm) => void;

  upgradeTarget: AdminOrg | null;
  upgradePending: boolean;
  upgradeResult: UpgradeResult | null;
  onUpgradeClose: () => void;
  onUpgradeConfirm: (plan: Plan, subdomain: string) => void;

  credentials: (ResetPasswordResult & { companyName: string }) | null;
  onCredentialsClose: () => void;
}

/**
 * Admin org ekranının üç diyaloğu. Sayfayı yalnız kompozisyon olarak tutmak
 * için ayrıldı (A19/A20) — diyalog seçim mantığı burada, durum sayfada.
 */
export function OrgDialogs(props: Props) {
  return (
    <>
      {props.creating && (
        <CreateOrgDialog
          kind={props.kind}
          pending={props.createPending}
          errorMessage={
            props.createFailed ? 'Oluşturulamadı. Bu VKN zaten kayıtlı olabilir.' : undefined
          }
          onClose={props.onCreateClose}
          onSubmit={props.onCreateSubmit}
        />
      )}

      {props.upgradeTarget && (
        <UpgradeDialog
          org={props.upgradeTarget}
          pending={props.upgradePending}
          result={props.upgradeResult}
          onClose={props.onUpgradeClose}
          onConfirm={props.onUpgradeConfirm}
        />
      )}

      {props.credentials && (
        <CredentialsDialog
          companyName={props.credentials.companyName}
          userCode={props.credentials.userCode}
          tempPassword={props.credentials.tempPassword}
          onClose={props.onCredentialsClose}
        />
      )}
    </>
  );
}
