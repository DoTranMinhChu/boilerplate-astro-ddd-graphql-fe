import { Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { toast } from '@core/components/toast/ToastProvider';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';

interface ChangePasswordFormProps {
  onSubmit: (input: { oldPassword: string; newPassword: string }) => Promise<any>;
  note?: string;
}

export function ChangePasswordForm(props: ChangePasswordFormProps) {
  const { Form, submitting, reset } = generateForm({
    handleSubmit: async (values: any) => {
      if (!values.oldPassword || !values.newPassword || !values.confirmPassword) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      if (values.newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      }
      if (values.newPassword !== values.confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      await props.onSubmit({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      toast().success('Đổi mật khẩu thành công');
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
          <h2 class="text-xl font-black text-gray-900">Đổi mật khẩu</h2>
          <p class="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập của bạn</p>
        </div>
      </div>

      <Card class="p-6 border-none shadow-sm">
        {/* ✅ Thay <div> bằng <Form> để Button submit hoạt động */}
        <Form class="flex flex-col gap-4">
          <Form.Field name="oldPassword" label="Mật khẩu hiện tại" required>
            <InputPassword placeholder="Nhập mật khẩu hiện tại" class="h-11" />
          </Form.Field>

          <div class="border-t border-dashed border-gray-200" />

          <Form.Field name="newPassword" label="Mật khẩu mới" required>
            <InputPassword placeholder="Tối thiểu 6 ký tự" class="h-11" />
          </Form.Field>

          <Form.Field name="confirmPassword" label="Xác nhận mật khẩu mới" required>
            <InputPassword placeholder="Nhập lại mật khẩu mới" class="h-11" />
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
              label="Cập nhật mật khẩu"
              loading={submitting()}
            />
          </div>
        </Form>
      </Card>
    </div>
  );
}