import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { Field, FieldProps } from '@core/components/form/Field';
import { useForm } from '@core/components/form/FormContext';
import { TINY_TEXT_MAX_LENGTH } from '@core/helpers/string';
import { generatePassword } from '@core/helpers/util';

export const MINIMUM_PASSWORD_LENGTH = 8;
export function PasswordField(props: FieldProps) {
  const { setValues } = useForm();
  const fieldName = () => props.name || 'password';
  return (
    <Field
      name={fieldName()}
      label="Mật khẩu"
      description="Khuyến nghị dùng tính năng đề xuất mật khẩu, mật khẩu sẽ hiển thị để sao chép sau khi tạo thành công."
      hint={`Từ ${MINIMUM_PASSWORD_LENGTH} đến ${TINY_TEXT_MAX_LENGTH} ký tự hoa thường, ký tự đặc biệt và số`}
      required
      validateText={{ min: MINIMUM_PASSWORD_LENGTH, max: TINY_TEXT_MAX_LENGTH }}
      {...props}
    >
      <div class="flex gap-1">
        <InputPassword class="flex-1" maxLength={TINY_TEXT_MAX_LENGTH} />
        <Button
          class="whitespace-nowrap"
          light
          label="Đề xuất mật khẩu"
          onClick={() => {
            const password = generatePassword();
            setValues(fieldName(), password);
          }}
        />
      </div>
    </Field>
  );
}
