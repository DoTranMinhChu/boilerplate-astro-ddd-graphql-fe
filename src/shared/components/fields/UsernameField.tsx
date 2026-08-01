import { FieldProps } from '@core/components/form/Field';
import { CodeField } from './CodeField';

export function UsernameField(props: FieldProps) {
  return <CodeField name="username" label="Tên đăng nhập" {...props} />;
}
