import { splitProps } from 'solid-js';
import {
  GeneratedFormInput,
  GeneratedFormProps,
  generateForm,
} from './generateForm';

export interface FormProps<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
> extends GeneratedFormProps<FormValues, FormResult>,
    GeneratedFormInput<FormValues, FormResult> {}
export function Form<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
>(props: FormProps<FormValues, FormResult>) {
  const [generatedFormProps, formProps] = splitProps(props, ['handleSubmit']);

  const { Form } = generateForm<FormValues, FormResult>(generatedFormProps);

  return <Form {...formProps} />;
}
