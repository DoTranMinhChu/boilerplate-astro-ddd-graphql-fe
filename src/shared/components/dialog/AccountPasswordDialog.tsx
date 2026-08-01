import { Formlog, FormlogProps } from '@core/components/dialog/Formlog';
import { Callout } from '@core/components/disclosure/Callout';
import { Field } from '@core/components/form/Field';
import { Value } from '@core/components/utilities/Value';
import { createEffect, createSignal } from 'solid-js';

interface AccountPasswordDialogProps extends Omit<FormlogProps, 'id'> {
  usernameLabel?: string;
  usernameContent?: string;
  passwordLabel?: string;
  passwordContent?: string;
}
export function AccountPasswordDialog(props: AccountPasswordDialogProps) {
  const [usernameContent, setUsernameContent] = createSignal('');
  const [passwordContent, setPasswordContent] = createSignal('');

  createEffect(() => {
    if (props.usernameContent) {
      setUsernameContent(props.usernameContent);
    }
    if (props.passwordContent) {
      setPasswordContent(props.passwordContent);
    }
  });

  return (
    <Formlog
      mode="main"
      isStrong={false}
      type="info"
      sm
      {...props}
      id="AccountPasswordDialog"
      submitLabel={props.submitLabel || 'Xác nhận đã lưu mật khẩu'}
      handleSubmit={() => {
        props.onClose?.();
      }}
    >
      <Field>
        <Callout
          info
          title="Xin lưu mật khẩu ở nơi an toàn"
          content="Thông tin này chỉ hiện một lần duy nhất"
        />
      </Field>
      <Field label={props.usernameLabel || 'Email đăng nhập'}>
        <Value copyable>{usernameContent()}</Value>
      </Field>
      <Field label={props.passwordLabel || 'Mật khẩu'}>
        <Value masked copyable>
          {passwordContent()}
        </Value>
      </Field>
    </Formlog>
  );
}
