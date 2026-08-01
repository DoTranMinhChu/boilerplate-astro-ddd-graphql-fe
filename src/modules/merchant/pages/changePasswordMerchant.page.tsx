import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { MerchantService } from '@/shared/services/merchant/merchant.service';

export function ChangePasswordMerchantPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await MerchantService.merchantChangePassword({ input });
      }}
      note="Mật khẩu Merchant được chia sẻ với tài khoản Agency/Tenant liên kết. Khi đổi mật khẩu, tất cả tài khoản liên kết cũng sẽ thay đổi theo."
    />
  );
}
