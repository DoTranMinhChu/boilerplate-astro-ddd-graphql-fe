import { Input } from '@core/components/control/Input';
import { Field, FieldProps } from '@core/components/form/Field';

export const MINIMUM_USERNAME_LENGTH = 3;
export const MAXIMUM_USERNAME_LENGTH = 32;
export function CodeField(props: FieldProps) {
  const fieldName = () => props.name || 'code';
  return (
    <Field
      name={fieldName()}
      label={props.label}
      hints={[
        `Từ ${MINIMUM_USERNAME_LENGTH} đến ${MAXIMUM_USERNAME_LENGTH} ký tự`,
        `Gồm chữ thường, số, gạch ngang và gạch dưới`,
        `Không đặt ký tự đặc biệt ở đầu, cuối hoặc liên tiếp`,
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
            ? `${props.label} không hợp lệ`
            : '';
        },
      }}
      {...props}
    >
      <Input maxLength={MAXIMUM_USERNAME_LENGTH} />
    </Field>
  );
}
