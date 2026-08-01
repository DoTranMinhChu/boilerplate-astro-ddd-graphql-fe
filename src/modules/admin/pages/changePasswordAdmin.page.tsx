import { ChangePasswordForm } from '@/shared/components/password/ChangePasswordForm';
import { AdminService } from '@/shared/services/admin/admin.service';

export function ChangePasswordAdminPage() {
  return (
    <ChangePasswordForm
      onSubmit={async (input) => {
        await AdminService.adminChangePassword({ input });
      }}
    />
  );
}
