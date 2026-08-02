import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { Field, FieldProps } from '@core/components/form/Field';
import { useForm } from '@core/components/form/FormContext';
import { TINY_TEXT_MAX_LENGTH } from '@core/helpers/string';
import { generatePassword } from '@core/helpers/util';
import { t } from '@/shared/i18n/t';

export const MINIMUM_PASSWORD_LENGTH = 8;
export function PasswordField(props: FieldProps) {
  const { setValues } = useForm();
  const fieldName = () => props.name || 'password';
  return (
    <Field
      name={fieldName()}
      label={t('shared.fields.password.label')}
      description={t('shared.fields.password.description')}
      hint={t('shared.fields.password.hint', { min: MINIMUM_PASSWORD_LENGTH, max: TINY_TEXT_MAX_LENGTH })}
      required
      validateText={{ min: MINIMUM_PASSWORD_LENGTH, max: TINY_TEXT_MAX_LENGTH }}
      {...props}
    >
      <div class="flex gap-1">
        <InputPassword class="flex-1" maxLength={TINY_TEXT_MAX_LENGTH} />
        <Button
          class="whitespace-nowrap"
          light
          label={t('shared.fields.password.suggestButton')}
          onClick={() => {
            const password = generatePassword();
            setValues(fieldName(), password);
          }}
        />
      </div>
    </Field>
  );
}
