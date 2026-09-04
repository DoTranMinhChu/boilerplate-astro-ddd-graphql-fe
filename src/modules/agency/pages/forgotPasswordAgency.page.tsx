import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { ForgotPasswordForm } from '@/shared/components/auth/ForgotPasswordForm';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordAgencyPage() {
    const { navigateToPage } = useRoutes();

    return (
        <ForgotPasswordForm
            title={t('agency.forgotPassword.pageTitle')}
            heading={t('agency.forgotPassword.heading')}
            subtitle={t('agency.forgotPassword.subtitle')}
            successMessage={t('agency.forgotPassword.successMessage')}
            successHint={t('agency.forgotPassword.successHint')}
            hasOrgCode
            codeFieldLabel={t('agency.forgotPassword.codeFieldLabel')}
            codePlaceholder={t('agency.forgotPassword.codePlaceholder')}
            codeRequiredError={t('agency.forgotPassword.errors.codeRequired')}
            loginFieldLabel={t('agency.forgotPassword.loginFieldLabel')}
            loginPlaceholder={t('agency.forgotPassword.loginPlaceholder')}
            loginRequiredError={t('agency.forgotPassword.errors.loginRequired')}
            submitLabel={t('agency.forgotPassword.submitLabel')}
            backToLoginLabel={t('agency.forgotPassword.backToLoginButton')}
            onBackToLogin={() => navigateToPage('agencyAuth.login')}
            onSubmit={async (values) => {
                await AgencyAccountService.agencyAccountForgotPassword({
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
