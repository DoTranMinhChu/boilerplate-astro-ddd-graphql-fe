import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { t } from '@/shared/i18n/t';

export function ChangePasswordMerchantPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await MerchantService.merchantChangePassword({ input });
      }}
      note={t('merchant.changePassword.note')}
    />
  );
}
