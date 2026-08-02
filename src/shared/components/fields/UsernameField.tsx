import { FieldProps } from '@core/components/form/Field';
import { CodeField } from './CodeField';
import { t } from '@/shared/i18n/t';

export function UsernameField(props: FieldProps) {
  return <CodeField name="username" label={t('shared.fields.username.label')} {...props} />;
}
