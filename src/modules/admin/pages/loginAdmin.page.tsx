import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { AdminService } from '@/shared/services/admin/admin.service';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { t } from '@/shared/i18n/t';


export function LoginAdminPage() {
  const { navigateToPage } = useRoutes();
  const auth = useAuth()!;

  createEffect(() => {
    if (auth.getAccountByType(EAccountType.ADMIN)) {
      navigateToPage('adminDashboard.default');
    }
  });

  return (
    <LoginForm
      title={t('admin.login.title')}
      heading="Admin Portal"
      subtitle={t('admin.login.subtitle')}
      usernameLabel={t('admin.login.usernameLabel')}
      usernamePlaceholder={t('admin.login.usernamePlaceholder')}
      passwordLabel={t('admin.login.passwordLabel')}
      submitLabel={t('admin.login.loginLabel')}
      forgotPasswordLabel={t('admin.login.forgotPassword')}
      footerBrand={t('admin.login.footerBrand')}
      loginFailedError={t('admin.login.loginFailed')}
      onForgotPassword={() => navigateToPage('adminAuth.forgotPassword')}
      onSubmit={async (values) => {
        const res = await AdminService.loginAdmin({
          data: {
            username: values.username,
            password: values.password,
          },
        });

        if (res?.token && res?.admin) {
          auth.setAuthData(EAccountType.ADMIN, res.admin, res.token);
          return { success: true };
        }

        throw new Error(t('admin.login.loginFailed'));
      }}
    />
  );
}
