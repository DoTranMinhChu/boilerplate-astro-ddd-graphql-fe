import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { t } from '@/shared/i18n/t';

export function ChangePasswordAgencyPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await AgencyAccountService.agencyAccountChangePassword({ input });
      }}
      note={t('agency.changePassword.note')}
    />
  );
}
