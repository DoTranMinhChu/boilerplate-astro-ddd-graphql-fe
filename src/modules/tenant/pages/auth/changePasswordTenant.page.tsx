import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';

export function ChangePasswordTenantPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await TenantAccountService.tenantAccountChangePassword({ input });
      }}
      note="Tài khoản Tenant sử dụng chung mật khẩu với tài khoản Merchant liên kết. Khi đổi mật khẩu, mật khẩu Merchant cũng thay đổi theo."
    />
  );
}
