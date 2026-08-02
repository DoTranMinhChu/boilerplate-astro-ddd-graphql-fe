import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import { t } from '@/shared/i18n/t';

export function ChangePasswordTenantPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await TenantAccountService.tenantAccountChangePassword({ input });
      }}
      note={t('tenant.changePassword.note')}
    />
  );
}
