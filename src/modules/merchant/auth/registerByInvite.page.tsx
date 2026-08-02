// src/pages/merchant/auth/RegisterByInvitePage.tsx

import { createSignal, createEffect, Show, createResource } from 'solid-js';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';

import { toast } from '@core/components/toast/ToastProvider';
import { Icon } from '@shared/components/icons/Icon';
import { EInvitationType } from '@/shared/generated/typed-graphql';
import { MerchantInvitationService } from '@/shared/services/merchantInvitation/merchantInvitation.service';
import { t } from '@/shared/i18n/t';

// ─── Helper: map invitation type → label hiển thị ─────────────────────────────

function getContextLabel(type?: string, agencyName?: string, tenantName?: string): {
    icon: string; color: string; title: string; description: string;
} {
    switch (type) {
        case EInvitationType.AGENCY_MEMBER:
            return {
                icon: 'heroicons-outline:briefcase',
                color: 'violet',
                title: t('merchant.registerByInvite.title.agencyMember', { name: agencyName || t('merchant.registerByInvite.defaultPartner') }),
                description: t('merchant.registerByInvite.desc.agencyMember'),
            };
        case EInvitationType.AGENCY_TO_TENANT:
            return {
                icon: 'heroicons-outline:building-office-2',
                color: 'indigo',
                title: t('merchant.registerByInvite.title.agencyToTenant', { name: tenantName || t('merchant.registerByInvite.defaultUnit') }),
                description: t('merchant.registerByInvite.desc.agencyToTenant', { agency: agencyName || '' }),
            };
        case EInvitationType.TENANT_MEMBER:
            return {
                icon: 'heroicons-outline:building-storefront',
                color: 'blue',
                title: t('merchant.registerByInvite.title.tenantMember', { name: tenantName || t('merchant.registerByInvite.defaultUnit') }),
                description: t('merchant.registerByInvite.desc.tenantMember'),
            };
        default:
            return {
                icon: 'heroicons-outline:envelope',
                color: 'gray',
                title: t('merchant.registerByInvite.title.default'),
                description: t('merchant.registerByInvite.desc.default'),
            };
    }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RegisterByInvitePage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth()!;

    // Invite code có thể lấy từ URL ?code=xxx hoặc người dùng nhập tay
    const [inviteCode, setInviteCode] = createSignal(searchParams.code || '');
    const [confirmedCode, setConfirmedCode] = createSignal(searchParams.code || '');

    // Load thông tin invitation khi có code
    const [invitation] = createResource(confirmedCode, async (code) => {
        if (!code || code.length < 8) return null;
        try {
            return await MerchantInvitationService.validateInviteCode({ inviteCode: code });
        } catch {
            return null;
        }
    });

    const ctx = () => getContextLabel(
        invitation()?.type!,
        invitation()?.agency?.name!,
        invitation()?.tenant?.name!,
    );

    const { Form, submitting } = generateForm({
        handleSubmit: async (values) => {
            if (!confirmedCode()) throw new Error(t('merchant.registerByInvite.errors.inviteCodeRequired'));

            const res = await MerchantService.registerByInvite({
                input: {
                    inviteCode: confirmedCode()!,
                    username: values.username,
                    password: values.password,
                    fullname: values.fullname,
                    phone: values.phone,
                }
            });

            if (!res?.token || !res?.merchant) throw new Error(t('merchant.registerByInvite.errors.registerFailed'));

            await auth.setMerchantAuthData(res.merchant, res.token);
            toast().success(t('merchant.registerByInvite.successToast'));
            return { success: true };
        },
    });

    // Sau khi đăng ký xong → về trang chọn context
    createEffect(() => {
        if (auth.isMerchant()) {
            navigateToPage('merchantAuth.selectContext');
        }
    });

    return (
        <AuthLayout title={t('merchant.registerByInvite.pageTitle')}>
            <div class="mb-6 text-center animate-fade-in">
                <h1 class="text-2xl font-bold text-gray-900">{t('merchant.registerByInvite.heading')}</h1>
                <p class="text-sm text-gray-500 mt-1">{t('merchant.registerByInvite.subtitle')}</p>
            </div>

            {/* ── Bước 1: Nhập / xác nhận invite code ──────────────────────────── */}
            <div class="mb-6">
                <div class="flex gap-2">
                    <Input
                        value={inviteCode()}
                        onChange={(val) => setInviteCode(val)}
                        placeholder={t('merchant.registerByInvite.inviteCodePlaceholder')}
                        class="h-11 flex-1 rounded-lg font-mono text-sm"
                        readOnly={!!searchParams.code}
                    />
                    <Show when={!searchParams.code}>
                        <Button
                            class="h-11 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm"
                            label={t('merchant.registerByInvite.confirmButton')}
                            onClick={() => setConfirmedCode(inviteCode())}
                        />
                    </Show>
                </div>

                {/* Trạng thái invitation */}
                <Show when={confirmedCode()}>
                    <div class="mt-3">
                        <Show
                            when={!invitation.loading}
                            fallback={
                                <div class="flex items-center gap-2 text-sm text-gray-400 px-1">
                                    <Icon name="svg-spinners:ring-resize" class="w-4 h-4" />
                                    {t('merchant.registerByInvite.checkingInvite')}
                                </div>
                            }
                        >
                            <Show
                                when={invitation()}
                                fallback={
                                    <div class="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                                        <Icon name="heroicons-outline:x-circle" class="w-4 h-4 flex shrink-0" />
                                        {t('merchant.registerByInvite.invalidInvite')}
                                    </div>
                                }
                            >
                                {/* Context card */}
                                <div class={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl border
                                    bg-${ctx().color}-50 border-${ctx().color}-200
                                `}>
                                    <div class={`
                                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                                        bg-${ctx().color}-100
                                    `}>
                                        <Icon name={ctx().icon} class={`w-5 h-5 text-${ctx().color}-600`} />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class={`font-bold text-${ctx().color}-800 text-sm`}>{ctx().title}</p>
                                        <p class={`text-xs text-${ctx().color}-600 mt-0.5`}>{ctx().description}</p>
                                    </div>
                                    <Icon name="heroicons-solid:check-circle" class={`w-5 h-5 text-${ctx().color}-500 flex shrink-0`} />
                                </div>
                            </Show>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* ── Bước 2: Form đăng ký (chỉ hiện khi invitation hợp lệ) ─────────── */}
            <Show when={invitation()}>
                <Form class="w-full flex flex-col gap-y-5">
                    <div class="border-t border-gray-100 pt-5">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                            {t('merchant.registerByInvite.accountInfoHeading')}
                        </p>

                        <Form.Fieldset class="flex flex-col gap-y-4">

                            {/* Email (readonly từ invitation) */}
                            <Show when={invitation()?.email}>
                                <div>
                                    <label class="text-sm font-semibold text-gray-700 block mb-1.5">{t('merchant.registerByInvite.emailLabel')}</label>
                                    <Input
                                        value={invitation()!.email!}
                                        readOnly
                                        class="h-11 w-full rounded-lg bg-gray-50 text-gray-500"
                                    />
                                </div>
                            </Show>

                            <Form.Field name="fullname" label={t('merchant.registerByInvite.fullnameLabel')} required>
                                <Input placeholder={t('merchant.registerByInvite.fullnamePlaceholder')} class="h-11 rounded-lg" />
                            </Form.Field>

                            <div class="grid grid-cols-2 gap-3">
                                <Form.Field name="username" label={t('merchant.registerByInvite.usernameLabel')} required>
                                    <Input placeholder={t('merchant.registerByInvite.usernamePlaceholder')} class="h-11 rounded-lg font-mono" />
                                </Form.Field>
                                <Form.Field name="phone" label={t('merchant.registerByInvite.phoneLabel')}>
                                    <Input placeholder="09xxxxxxxx" class="h-11 rounded-lg" />
                                </Form.Field>
                            </div>

                            <Form.Field name="password" label={t('merchant.registerByInvite.passwordLabel')} required>
                                <InputPassword placeholder={t('merchant.registerByInvite.passwordPlaceholder')} class="h-11 rounded-lg" />
                            </Form.Field>

                            <Form.Error class="text-sm text-red-600 font-medium" />

                            <Button
                                wide main submit
                                class="h-12 w-full text-base font-bold rounded-lg mt-1"
                                label={t('merchant.registerByInvite.submitLabel')}
                                loading={submitting()}
                            />
                        </Form.Fieldset>
                    </div>
                </Form>
            </Show>

            <div class="mt-8 text-center">
                <p class="text-xs text-gray-400">
                    {t('merchant.registerByInvite.haveAccount')}{' '}
                    <button
                        onClick={() => navigateToPage('merchantAuth.login')}
                        class="text-violet-600 font-semibold hover:underline"
                    >
                        {t('merchant.registerByInvite.loginLink')}
                    </button>
                </p>
            </div>
        </AuthLayout>
    );
}