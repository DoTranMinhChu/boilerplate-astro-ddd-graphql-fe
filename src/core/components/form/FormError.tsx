import { useForm } from './FormContext';
import { FormMessage } from './FormMessage';

export interface FormErrorProps extends BaseProps {
  text?: string | JSX.Element;
}
export function FormError(props: FormErrorProps) {
  const { formError } = useForm();
  const formErrorMessage = () => formError()?.message;

  return (
    <>
      <FormMessage danger text={props.text || formErrorMessage()} />
    </>
  );
}
