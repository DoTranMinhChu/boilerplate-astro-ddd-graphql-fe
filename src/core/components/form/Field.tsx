import { getCol, mergeClass } from '@core/helpers/class';
import { generateId } from '@core/helpers/util';
import { createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import { ControlType } from '../control/createControl';
import { FieldContext } from './FieldContext';
import { FieldFooter, FieldFooterProps } from './FieldFooter';
import { useForm } from './FormContext';
import { Label, LabelProps } from './Label';
import { FieldName } from './generateForm';

export type ResolverFunction = (
  value: any,
  values: any,
) => string | Promise<string>;
export type FieldValidate = {
  validateText?: FieldValidateText;
  validate?: FieldValidateCustom;
};
export type FieldValidateCustom = {
  [key: string]: ResolverFunction | boolean | number | any | undefined;
};
export type FieldValidateText = {
  url?: boolean;
  email?: boolean;
  code?: boolean;
  tiny?: boolean;
  short?: boolean;
  medium?: boolean;
  long?: boolean;
  min?: number;
  max?: number;
};
export type ControlMetadata = {
  type: ControlType;
  nullable: boolean;
  defaultValue: any;
  readOnly?: boolean;
  disabled?: boolean;
  isControlled?: boolean;
  onValueSet?: (val: any) => any;
};

export interface FieldProps<FormValues extends object = any>
  extends BaseProps,
    LabelProps,
    FieldFooterProps,
    FieldValidate {
  name?: FieldName<FormValues>;
  error?: string | string[];
  readOnly?: boolean;
  disabled?: boolean;
  col?: Col;
  labelClass?: string;
  labelChildren?: JSX.Element;
  hasFooter?: boolean;
  footerClass?: string;
  control?: ControlMetadata;
}
export function Field<FormValues extends object = any>(
  props: FieldProps<FormValues>,
) {
  const {
    id: formId,
    value,
    setValues,
    registerField,
    unregisterField,
    readOnly: formReadOnly,
    errors,
    setErrors,
  } = useForm();

  const id = generateId();
  const name = () => props.name;
  const error = () => props.error || errors?.()?.[name()] || '';
  const readOnly = () => props.readOnly || formReadOnly() || false;
  const disabled = () => props.disabled || false;
  const required = () => (readOnly() || disabled() ? false : props.required);
  const fieldValue = () => (props.name ? value?.(props.name) : undefined);
  const setValue = (val: any) => {
    if (name()) {
      if (fieldValue() !== val) {
        clearError();
        setValues?.(name()!, val);
      }
    }
  };
  const clearError = () => {
    if (error()) {
      const newErrors = { ...errors() };
      delete newErrors[name()];
      setErrors(newErrors);
    }
  };

  const [control, setControl] = createSignal<ControlMetadata>();
  const [hasRegisterFieldWithControl, setHasRegisterFieldWithControl] =
    createSignal(false);

  createEffect(() => {
    const fieldName = name();
    const validateText = props.validateText;
    const validateCustom = props.validate;
    const fieldControl = control();
    if (hasForm() && fieldName && fieldControl) {
      untrack(() => {
        registerField?.(fieldName, {
          type: fieldControl.type,
          nullable: fieldControl.nullable,
          defaultValue: fieldControl.defaultValue,
          readOnly: readOnly(),
          disabled: disabled(),
          validate: {
            required: required(),
            text: { ...validateText },
            custom: {
              ...validateCustom,
            },
          },
          onValueSet: (val: any) => {
            fieldControl.onValueSet?.(val);
          },
        });
        setHasRegisterFieldWithControl(true);
      });
    } else {
      untrack(() => {
        if (hasRegisterFieldWithControl()) {
          unregisterField(fieldName!);
        }
      });
    }
  });

  onCleanup(() => {
    if (name()) {
      unregisterField(name()!);
    }
  });

  const hasForm = () => !!formId;
  const hasFooter = () => props.hasFooter ?? true;

  const fieldClass = () =>
    mergeClass(
      'max-w-full auto-rows-min animate-emerge col-span-full flex flex-col',
      getCol(props.col),
      props.class,
    );

  const registerControl = (control: ControlMetadata) => {
    setControl(control);
  };

  createEffect(() => {
    if (props.control) {
      registerControl(props.control);
    }
  });

  return (
    <FieldContext.Provider
      value={{
        id,
        name: name as any,
        value: fieldValue,
        setValue,
        readOnly,
        disabled,
        error,
        clearError,
        hasForm: hasForm(),
        registerControl,
        control,
      }}
    >
      <div class={fieldClass()} style={props.style}>
        {props.label !== undefined && (
          <Label
            id={props.id}
            label={props.label}
            class={props.labelClass}
            subtitle={props.subtitle}
            subtitleClass={props.subtitleClass}
            description={props.description}
            descriptionClass={props.descriptionClass}
            tooltip={props.tooltip}
            tooltipClass={props.tooltipClass}
            tooltipIcon={props.tooltipIcon}
            required={required()}
            requiredClass={props.requiredClass}
            requiredIcon={props.requiredIcon}
          >
            {props.labelChildren}
          </Label>
        )}
        {props.children}
        {hasFooter() && (
          <FieldFooter
            hint={props.hint}
            hints={props.hints}
            hintClass={props.hintClass}
            hintBullet={props.hintBullet}
            class={props.hintClass}
            error={error()}
            errorClass={props.errorClass}
          />
        )}
      </div>
    </FieldContext.Provider>
  );
}
