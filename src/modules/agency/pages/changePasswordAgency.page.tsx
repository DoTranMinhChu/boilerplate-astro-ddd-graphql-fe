import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';

export function ChangePasswordAgencyPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await AgencyAccountService.agencyAccountChangePassword({ input });
      }}
      note="Tài khoản Agency sử dụng chung mật khẩu với tài khoản Merchant liên kết. Khi đổi mật khẩu, mật khẩu Merchant cũng thay đổi theo."
    />
  );
}
