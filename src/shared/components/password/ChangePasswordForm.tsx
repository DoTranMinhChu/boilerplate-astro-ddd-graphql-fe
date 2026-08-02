import { Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { toast } from '@core/components/toast/ToastProvider';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';

interface ChangePasswordFormProps {
  onSubmit: (input: { oldPassword: string; newPassword: string }) => Promise<any>;
  note?: string;
}

export function ChangePasswordForm(props: ChangePasswordFormProps) {
  const { Form, submitting, reset } = generateForm({
    handleSubmit: async (values: any) => {
      if (!values.oldPassword || !values.newPassword || !values.confirmPassword) {
        throw new Error(t('shared.password.changeForm.errorRequired'));
      }
      if (values.newPassword.length < 6) {
        throw new Error(t('shared.password.changeForm.errorMinLength'));
      }
      if (values.newPassword !== values.confirmPassword) {
        throw new Error(t('shared.password.changeForm.errorMismatch'));
      }
      await props.onSubmit({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      toast().success(t('shared.password.changeForm.success'));
      reset();
      return { success: true };
    },
  });

  return (
    <div class="max-w-xl mx-auto animate-in">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="heroicons-outline:key" class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 class="text-xl font-black text-gray-900">{t('shared.password.changeForm.title')}</h2>
          <p class="text-sm text-gray-500">{t('shared.password.changeForm.subtitle')}</p>
        </div>
      </div>

      <Card class="p-6 border-none shadow-sm">
        {/* ✅ Thay <div> bằng <Form> để Button submit hoạt động */}
        <Form class="flex flex-col gap-4">
          <Form.Field name="oldPassword" label={t('shared.password.changeForm.oldPasswordLabel')} required>
            <InputPassword placeholder={t('shared.password.changeForm.oldPasswordPlaceholder')} class="h-11" />
          </Form.Field>

          <div class="border-t border-dashed border-gray-200" />

          <Form.Field name="newPassword" label={t('shared.password.changeForm.newPasswordLabel')} required>
            <InputPassword placeholder={t('shared.password.changeForm.newPasswordPlaceholder')} class="h-11" />
          </Form.Field>

          <Form.Field name="confirmPassword" label={t('shared.password.changeForm.confirmPasswordLabel')} required>
            <InputPassword placeholder={t('shared.password.changeForm.confirmPasswordPlaceholder')} class="h-11" />
          </Form.Field>

          <Show when={props.note}>
            <div class="w-full flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Icon name="heroicons-outline:exclamation-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p class="text-xs text-amber-700 leading-relaxed">{props.note}</p>
            </div>
          </Show>

          <Form.Error class="text-sm text-red-600 font-medium" />

          <div class="flex justify-end pt-1">
            <Button
              submit main
              class="px-6 py-2.5 rounded-xl font-bold"
              label={t('shared.password.changeForm.submitLabel')}
              loading={submitting()}
            />
          </div>
        </Form>
      </Card>
    </div>
  );
}