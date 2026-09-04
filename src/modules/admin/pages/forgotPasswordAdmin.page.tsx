import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { ForgotPasswordForm } from '@/shared/components/auth/ForgotPasswordForm';
import { AdminService } from '@/shared/services/admin/admin.service';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordAdminPage() {
    const { navigateToPage } = useRoutes();

    return (
        <ForgotPasswordForm
            title={t('admin.forgotPassword.title')}
            heading={t('admin.forgotPassword.heading')}
            subtitle={t('admin.forgotPassword.subtitle')}
            successMessage={t('admin.forgotPassword.successMessage')}
            successHint={t('admin.forgotPassword.successHint')}
            loginFieldLabel={t('admin.forgotPassword.fieldLabel')}
            loginPlaceholder={t('admin.forgotPassword.placeholder')}
            loginRequiredError={t('admin.forgotPassword.errorLoginRequired')}
            submitLabel={t('admin.forgotPassword.submitLabel')}
            backToLoginLabel={t('admin.forgotPassword.backToLogin')}
            onBackToLogin={() => navigateToPage('adminAuth.login')}
            onSubmit={async (values) => {
                await AdminService.adminForgotPassword({
                    input: {
                        login: values.login,
                        domain: window.location.origin,
                    },
                });
            }}
        />
    );
}
