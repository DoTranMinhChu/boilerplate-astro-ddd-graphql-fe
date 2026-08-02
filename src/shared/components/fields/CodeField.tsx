import { Input } from '@core/components/control/Input';
import { Field, FieldProps } from '@core/components/form/Field';
import { t } from '@/shared/i18n/t';

export const MINIMUM_USERNAME_LENGTH = 3;
export const MAXIMUM_USERNAME_LENGTH = 32;
export function CodeField(props: FieldProps) {
  const fieldName = () => props.name || 'code';
  return (
    <Field
      name={fieldName()}
      label={props.label}
      hints={[
        t('shared.fields.code.hintLength', { min: MINIMUM_USERNAME_LENGTH, max: MAXIMUM_USERNAME_LENGTH }),
        t('shared.fields.code.hintChars'),
        t('shared.fields.code.hintSpecial'),
      ]}
      required
      validateText={{
        min: MINIMUM_USERNAME_LENGTH,
        max: MAXIMUM_USERNAME_LENGTH,
      }}
      validate={{
        checkCode: (value: string) => {
          return !/^(?![_-])(?!.*[_-]{2})[a-z0-9]([a-z0-9_-]{1,30})[a-z0-9]$/.test(
            value,
          )
            ? t('shared.fields.code.invalid', { label: String(props.label ?? '') })
            : '';
        },
      }}
      {...props}
    >
      <Input maxLength={MAXIMUM_USERNAME_LENGTH} />
    </Field>
  );
}
