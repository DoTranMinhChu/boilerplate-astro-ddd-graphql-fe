import { baseConfig } from '@core/components/config/BaseConfig';
import { joinClass } from '@core/helpers/class';
import { Show, splitProps } from 'solid-js';
import { Field, FieldProps } from '../form/Field';
import { Fieldset, FieldsetProps } from '../form/FieldSet';
import { useForm } from '../form/FormContext';
import { FormError, FormErrorProps } from '../form/FormError';
import { FormMessage } from '../form/FormMessage';
import {
  GeneratedFormInput,
  GeneratedFormProps,
  generateForm,
  GenerateFormOutput,
} from '../form/generateForm';
import {
  Dialog,
  DialogFooterProps,
  DialogHeaderProps,
  DialogProps,
} from './Dialog';
import { Slideout } from './Slideout';

export interface GeneratedFormlogProps<
  FormValues extends {
    [x: string]: any;
  } = never,
  FormResult = never,
> extends DialogProps,
  Omit<DialogHeaderProps, 'id'>,
  Omit<DialogFooterProps, 'onSubmit' | 'id'>,
  Omit<GeneratedFormProps<FormValues, FormResult>, 'id'> {
  /* 320px */
  xs?: boolean;
  /* 480px */
  sm?: boolean;
  /* 768px */
  md?: boolean;
  /* 1024px */
  lg?: boolean;
  /* 1280px */
  xl?: boolean;
  /* 1440px */
  xl2?: boolean;
  formClass?: string;
  headerClass?: string;
  bodyClass?: string;
  footerClass?: string;
  modalType?: 'dialog' | 'slideout';
}

export type GenerateFormlogOutput<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
> = {
  Formlog: {
    (props: GeneratedFormlogProps<FormValues, FormResult>): JSX.Element;
    Fieldset(props: FieldsetProps): JSX.Element;
    Field(props: FieldProps<FormValues>): JSX.Element;
    Error(props: FormErrorProps): JSX.Element;
  };
} & Omit<GenerateFormOutput<FormValues, FormResult>, 'Form'>;
export function generateFormlog<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
>(generateFormInput: GeneratedFormInput<FormValues, FormResult>) {
  const { Form, ...rest } = generateForm(generateFormInput);

  const GeneratedFormlog = (
    props: GeneratedFormlogProps<FormValues, FormResult>,
  ) => {
    const modalType = props.modalType || 'dialog';

    const [formProps, headerProps, footerProps, _childrenProps, modalProps] =
      splitProps(
        props,
        ['grid', 'initialValues', 'onChange', 'onSubmitted'],
        [
          'title',
          'titleClass',
          'hasBack',
          'backButtonProps',
          'hasClose',
          'closeButtonProps',
        ],
        [
          'type',
          'isStrong',
          'reverse',
          'submitLabel',
          'cancelLabel',
          'submitLoading',
          'submitDisabled',
          'submitClass',
          'cancelClass',
          'cancelLoading',
          'cancelDisabled',
          'submitProps',
          'cancelProps',
          'onCancel',
          'buttonGroupClass',
          'footerClass',
        ],
        ['children'],
      );

    const formClass = () =>
      joinClass(
        `bg-inherit rounded-inherit flex-column h-full`,
        props.formClass,
      );

    const Modal = modalType == 'dialog' ? Dialog : Slideout;
    return (
      <Modal {...modalProps}>
        <Form {...formProps} class={formClass()}>
          <Show when={headerProps.title}>
            <Modal.Header {...headerProps} class={props.headerClass} />
          </Show>
          <Modal.Body class={props.bodyClass}>
            <Fieldset>
              {props.children}
              <Form.Error />
            </Fieldset>
          </Modal.Body>
          <FormlogFooter
            modalType={modalType}
            cancelLabel={baseConfig().confirmCancelLabel}
            {...footerProps}
            class={props.footerClass}
          />
        </Form>
      </Modal>
    );
  };
  GeneratedFormlog.Fieldset = Fieldset;
  GeneratedFormlog.Field = Field as any;
  GeneratedFormlog.Error = FormError;
  GeneratedFormlog.Message = FormMessage;

  return { Formlog: GeneratedFormlog, ...rest };
}

function FormlogFooter(
  props: DialogFooterProps & { modalType: 'dialog' | 'slideout' },
) {
  const Modal = props.modalType == 'dialog' ? Dialog : Slideout;
  const { isSubmitLocked, submitting } = useForm();

  return (
    <Modal.Footer
      {...props}
      submitLoading={submitting()}
      submitDisabled={isSubmitLocked() || props.submitProps?.disabled}
    />
  );
}

export interface FormlogProps<
  FormValues extends {
    [x: string]: any;
  } = any,
  FormResult = any,
> extends GeneratedFormlogProps<FormValues, FormResult>,
  GeneratedFormInput<FormValues, FormResult> { }
export function Formlog<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
>(props: FormlogProps<FormValues, FormResult>) {
  const [generatedFormProps, formProps] = splitProps(props, [
    'transformValues',
    'handleSubmit',
  ]);

  const { Formlog } = generateFormlog<FormValues, FormResult>(
    generatedFormProps,
  );

  return <Formlog {...formProps} />;
}
