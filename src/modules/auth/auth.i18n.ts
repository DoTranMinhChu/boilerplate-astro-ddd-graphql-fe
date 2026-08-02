// Module-scoped i18n dictionary for src/modules/auth.
// Standalone during Phase-3 mass-extraction rollout — referenced via string keys
// (e.g. t('auth.resetPassword.title')) until merged into the central dictionaries.

export const authVi = {
    auth: {
        resetPassword: {
            pageTitle: 'Đặt lại mật khẩu',
            heading: 'Đặt lại mật khẩu',
            subtitlePrefix: 'Nhập mật khẩu mới cho tài khoản',
            tokenInvalidError: 'Token không hợp lệ hoặc đã hết hạn',
            passwordTooShortError: 'Mật khẩu mới phải có ít nhất 6 ký tự',
            passwordMismatchError: 'Mật khẩu xác nhận không khớp',
            successMessage: 'Đặt lại mật khẩu thành công!',
            successHint: 'Bạn có thể đăng nhập bằng mật khẩu mới.',
            loginNowButton: 'Đăng nhập ngay',
            linkInvalidMessage: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
            tokenExpiryHint: 'Token có hiệu lực 30 phút kể từ khi gửi email.',
            resendEmailButton: 'Gửi lại email',
            newPasswordLabel: 'Mật khẩu mới',
            newPasswordPlaceholder: 'Tối thiểu 6 ký tự',
            confirmPasswordLabel: 'Xác nhận mật khẩu mới',
            confirmPasswordPlaceholder: 'Nhập lại mật khẩu mới',
            submitButton: 'Đặt lại mật khẩu',
            backToLoginButton: 'Quay lại đăng nhập',
        },
    },
};

export const authEn = {
    auth: {
        resetPassword: {
            pageTitle: 'Reset password',
            heading: 'Reset password',
            subtitlePrefix: 'Enter a new password for account',
            tokenInvalidError: 'Invalid or expired token',
            passwordTooShortError: 'New password must be at least 6 characters',
            passwordMismatchError: 'Password confirmation does not match',
            successMessage: 'Password reset successful!',
            successHint: 'You can now sign in with your new password.',
            loginNowButton: 'Sign in now',
            linkInvalidMessage: 'The password reset link is invalid or has expired.',
            tokenExpiryHint: 'The token is valid for 30 minutes after the email is sent.',
            resendEmailButton: 'Resend email',
            newPasswordLabel: 'New password',
            newPasswordPlaceholder: 'At least 6 characters',
            confirmPasswordLabel: 'Confirm new password',
            confirmPasswordPlaceholder: 'Re-enter new password',
            submitButton: 'Reset password',
            backToLoginButton: 'Back to sign in',
        },
    },
};
