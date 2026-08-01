import { mergeClass } from '@core/helpers/class';
import { ButtonGroup, ButtonGroupProps } from '../button/ButtonGroup';
import { useForm } from './FormContext';

export interface FormFooterProps extends ButtonGroupProps {}
export function FormFooter(props: FormFooterProps) {
  const { reset, isSubmitLocked, submitting } = useForm();
  const footerClass = () => mergeClass('-m-2 mt-2 bg-inherit', props.class);

  return (
    <div class={footerClass()}>
      <ButtonGroup
        reverse
        cancelLabel={'Reset'}
        onCancel={reset}
        type="main"
        isStrong
        submitLoading={submitting()}
        submitDisabled={isSubmitLocked() || props.submitProps?.disabled}
        {...props}
      />
    </div>
  );
}
