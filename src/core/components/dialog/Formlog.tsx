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
    // Drawer-reactivity fix (follow-up review, Task 19): this used to be
    // `const modalType = props.modalType || 'dialog';` — a plain const computed ONCE at
    // component setup, never re-read when `props.modalType` changes later (it's bound to a
    // live signal by callers like manageContentEntries.page.tsx's `formlogMode()` via
    // DatatableFormlog -> Formlog). Made into an accessor so every reader below re-evaluates.
    const modalType = () => props.modalType || 'dialog';

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

    // Dialog/Slideout are COMPOUND components — `<Dialog.Header>`/`<Slideout.Header>` (etc.)
    // are genuinely different components attached as static properties of whichever function
    // reference is used literally in JSX. A reactive accessor holding "the currently chosen
    // component" (e.g. `createMemo(() => modalType() == 'dialog' ? Dialog : Slideout)`) can't
    // be `.Header`'d off in JSX — `<Modal().Header>` isn't valid JSX, and reading `Modal()`
    // once into a plain `const Modal = ...` (the ORIGINAL bug in this exact file, x2) is
    // exactly the non-reactive mistake we're fixing. Solid's `<Dynamic component={...}>`
    // solves "pick a component reactively" for a single outer tag, but its result doesn't
    // expose `.Header`/`.Body`/`.Footer` sub-components either. So: branch the ENTIRE subtree
    // with `<Show>` instead — a `modalType()` flip tears down the old Dialog/Slideout instance
    // and mounts the other fresh, rather than trying to swap sub-properties on one live
    // reference. `renderChrome` factors out the shared Form/Fieldset body so that JSX exists
    // only ONCE; only the `Modal` reference passed to it differs per branch. Because `<Show>`
    // (like every Solid component) receives its `children`/`fallback` JSX as a LAZY GETTER —
    // the same mechanism that makes any non-literal JSX prop expression reactive — the
    // `renderChrome(...)` calls below are NOT invoked eagerly at setup; each one only runs
    // when its branch actually becomes active, so `Modal` inside it is always the literal
    // Dialog/Slideout reference matching the branch that's mounting, never stale.
    const renderChrome = (
      Modal: typeof Dialog | typeof Slideout,
    ) => (
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
            Modal={Modal}
            cancelLabel={baseConfig().confirmCancelLabel}
            {...footerProps}
            class={props.footerClass}
          />
        </Form>
      </Modal>
    );

    return (
      <Show
        when={modalType() === 'dialog'}
        fallback={renderChrome(Slideout)}
      >
        {renderChrome(Dialog)}
      </Show>
    );
  };
  GeneratedFormlog.Fieldset = Fieldset;
  GeneratedFormlog.Field = Field as any;
  GeneratedFormlog.Error = FormError;
  GeneratedFormlog.Message = FormMessage;

  return { Formlog: GeneratedFormlog, ...rest };
}

// Drawer-reactivity fix (follow-up review, Task 19): this used to independently re-derive
// `const Modal = props.modalType == 'dialog' ? Dialog : Slideout;` from a plain `modalType`
// STRING prop — the 3rd of the 3 non-reactive spots, computed once at setup and never
// re-read. Rather than repeat the same `<Show>`-branching fix a third time here, the caller
// (`renderChrome` above) already knows, concretely, which compound-component family it's
// rendering for this mount — so it's simpler and just as correct to accept that resolved
// `Modal` reference directly as a prop instead of re-deriving it from a string. Since
// `FormlogFooter` only ever mounts as a child of `renderChrome`'s output, and that whole
// subtree is torn down and remounted fresh by the `<Show>` above whenever `modalType()`
// flips, `props.Modal` here is always correct for the mount it's read in — no separate
// reactive re-derivation needed.
function FormlogFooter(
  props: DialogFooterProps & { Modal: typeof Dialog | typeof Slideout },
) {
  const { isSubmitLocked, submitting } = useForm();

  return (
    <props.Modal.Footer
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
