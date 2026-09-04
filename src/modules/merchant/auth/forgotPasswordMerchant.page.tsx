import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { ForgotPasswordForm } from '@/shared/components/auth/ForgotPasswordForm';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordMerchantPage() {
    const { navigateToPage } = useRoutes();

    return (
        <ForgotPasswordForm
            title={t('merchant.forgotPassword.pageTitle')}
            heading={t('merchant.forgotPassword.heading')}
            subtitle={t('merchant.forgotPassword.subtitle')}
            successMessage={t('merchant.forgotPassword.successMessage')}
            successHint={t('merchant.forgotPassword.successHint')}
            loginFieldLabel={t('merchant.forgotPassword.loginFieldLabel')}
            loginPlaceholder={t('merchant.forgotPassword.loginPlaceholder')}
            loginRequiredError={t('merchant.forgotPassword.errors.loginRequired')}
            submitLabel={t('merchant.forgotPassword.submitLabel')}
            backToLoginLabel={t('merchant.forgotPassword.backToLoginButton')}
            onBackToLogin={() => navigateToPage('merchantAuth.login')}
            onSubmit={async (values) => {
                await MerchantService.merchantForgotPassword({
                    input: {
                        login: values.login,
                        domain: window.location.origin,
                    },
                });
            }}
        />
    );
}
