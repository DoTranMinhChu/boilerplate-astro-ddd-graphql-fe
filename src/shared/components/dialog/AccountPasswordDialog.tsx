import { Formlog, FormlogProps } from '@core/components/dialog/Formlog';
import { Callout } from '@core/components/disclosure/Callout';
import { Field } from '@core/components/form/Field';
import { Value } from '@core/components/utilities/Value';
import { createEffect, createSignal } from 'solid-js';
import { t } from '@/shared/i18n/t';

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
      submitLabel={props.submitLabel || t('shared.dialog.accountPassword.submitLabel')}
      handleSubmit={() => {
        props.onClose?.();
      }}
    >
      <Field>
        <Callout
          info
          title={t('shared.dialog.accountPassword.calloutTitle')}
          content={t('shared.dialog.accountPassword.calloutContent')}
        />
      </Field>
      <Field label={props.usernameLabel || t('shared.dialog.accountPassword.usernameLabel')}>
        <Value copyable>{usernameContent()}</Value>
      </Field>
      <Field label={props.passwordLabel || t('shared.dialog.accountPassword.passwordLabel')}>
        <Value masked copyable>
          {passwordContent()}
        </Value>
      </Field>
    </Formlog>
  );
}
