import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { ForgotPasswordForm } from '@/shared/components/auth/ForgotPasswordForm';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordTenantPage() {
    const { navigateToPage } = useRoutes();

    return (
        <ForgotPasswordForm
            title={t('tenant.forgotPassword.pageTitle')}
            heading={t('tenant.forgotPassword.heading')}
            subtitle={t('tenant.forgotPassword.subtitle')}
            successMessage={t('tenant.forgotPassword.successMessage')}
            successHint={t('tenant.forgotPassword.successHint')}
            hasOrgCode
            codeFieldLabel={t('tenant.forgotPassword.codeFieldLabel')}
            codePlaceholder={t('tenant.forgotPassword.codePlaceholder')}
            codeRequiredError={t('tenant.forgotPassword.errors.codeRequired')}
            loginFieldLabel={t('tenant.forgotPassword.loginFieldLabel')}
            loginPlaceholder={t('tenant.forgotPassword.loginPlaceholder')}
            loginRequiredError={t('tenant.forgotPassword.errors.loginRequired')}
            submitLabel={t('tenant.forgotPassword.submitLabel')}
            backToLoginLabel={t('tenant.forgotPassword.backToLoginButton')}
            onBackToLogin={() => navigateToPage('tenantAuth.login')}
            onSubmit={async (values) => {
                await TenantAccountService.tenantAccountForgotPassword({
                    input: {
                        code: values.code,
                        login: values.login,
                        domain: window.location.origin,
                    },
                });
            }}
        />
    );
}
