import { mergeClass } from '@core/helpers/class';
import { generateId, Util } from '@core/helpers/util';
import { isObject } from 'imask/esm/core/utils';
import { isArray, mapValues } from 'radashi';
import {
  Accessor,
  batch,
  createEffect,
  createSignal,
  Show,
  untrack,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { ControlType } from '../control/createControl';
import { detachFromStore } from './detachFromStore';
import {
  Field,
  FieldProps,
  FieldValidateCustom,
  FieldValidateText,
} from './Field';
import { Fieldset, FieldsetProps } from './FieldSet';
import { FormContext } from './FormContext';
import { FormError, FormErrorProps } from './FormError';
import { FormFooter, FormFooterProps } from './FormFooter';
import { FormMessage, FormMessageProps } from './FormMessage';
import { validateForm } from './validateForm';

const POST_SUBMIT_DELAY = 500;
export type GenerateFormOutput<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
> = {
  Form: {
    (props: GeneratedFormProps<FormValues, FormResult>): JSX.Element;
    Footer(props: FormFooterProps): JSX.Element;
    Fieldset(props: FieldsetProps): JSX.Element;
    Field(props: FieldProps<FormValues>): JSX.Element;
    Error(props: FormErrorProps): JSX.Element;
    Message(props: FormMessageProps): JSX.Element;
  };
  value: (field: FieldName<FormValues>) => any;
  values: () => FormValues;
  readOnly: Accessor<boolean>;
  submitting: Accessor<boolean>;
  submitted: Accessor<boolean>;
  submittedValues: Accessor<FormValues | undefined>;
  submittedResult: Accessor<FormResult | undefined>;
  isSubmitLocked: Accessor<boolean>;
  reset: () => void;
};

export type GeneratedFormInput<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
> = {
  transformValues?: (values: FormValues) => FormValues;
  handleSubmit?: (
    values: FormValues,
  ) => Promise<FormResult | undefined | null> | FormResult;
  afterSubmit?: (result: FormResult) => any;
  handleError?: (err: any) => any;
};

export type FieldName<FormValues> = {
  [Key in keyof FormValues & (string | number)]: NonNullable<
    FormValues[Key]
  > extends ReadonlyArray<infer U>
  ? `${Key}` | `${Key}.${number}` | `${Key}.${number}.${FieldName<U>}`
  : NonNullable<FormValues[Key]> extends object
  ? `${Key}` | `${Key}.${FieldName<NonNullable<FormValues[Key]>>}`
  : `${Key}`;
}[keyof FormValues & (string | number)];

export interface GeneratedFormProps<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
> extends BaseProps {
  /** Turn on grid mode. By default, 12 columns with 1rem horizontal gap. */
  grid?: boolean;
  initialValues?: FormValues;
  autoCompleteOff?: boolean;
  onChange?: (
    values: FormValues,
    fields: Partial<{
      [key in FieldName<FormValues>]: FieldMetadata;
    }>,
  ) => any;
  onSubmitted?: (values: FormValues, result: FormResult) => any;
}

export function generateForm<
  FormValues extends {
    [x: string]: any;
  },
  FormResult,
>({
  transformValues,
  handleSubmit,
  afterSubmit,
  handleError,
}: GeneratedFormInput<FormValues, FormResult>) {
  const id = generateId();

  const [errors, setErrors] = createSignal<Partial<FormValues>>({});
  const [readOnly, setReadOnly] = createSignal(false);
  const [formError, setFormError] = createSignal<Error>();
  const [submitting, setSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);
  const [isSubmitLocked, setIsSubmitLocked] = createSignal(false);
  const [submittedValues, setSubmittedValues] = createSignal<
    FormValues | undefined
  >();
  const [submittedResult, setSubmittedResult] = createSignal<
    FormResult | undefined
  >();
  const [fields, setFields] = createSignal<
    Partial<{
      [key in FieldName<FormValues>]: FieldMetadata;
    }>
  >({});
  const [resetCounter, setResetCounter] = createSignal(-1);
  const [initialValues, setInitialValues] = createSignal<
    Partial<FormValues> | undefined
  >();
  const [data, setData] = createStore<FormValues>({} as FormValues);
  const [dataValues, setDataValues] = createSignal<FormValues>(
    {} as FormValues,
  );

  const submitValues = () => {
    const formFields = fields();
    const formValues = values();
    let submitValues = {};
    (Object.keys(formFields) as FieldName<FormValues>[]).forEach((key) => {
      const field = formFields[key];
      if (!field || field.disabled) return;

      const currentData = Util.get(formValues, key);
      submitValues = Util.set(submitValues, key, currentData);
    });
    return submitValues as FormValues;
  };

  const clearSubmit = () => {
    batch(() => {
      setSubmittedResult();
      setSubmittedValues();
      setTimeout(() => {
        setIsSubmitLocked(false);
      }, POST_SUBMIT_DELAY);
    });
  };

  const reset = () => {
    batch(() => {
      clearSubmit();
      clearErrors();
      setReadOnly(false);
      setData(
        produce((data) => {
          Object.keys(data).forEach((key) => delete data[key]);
          Object.assign(data, Util.cloneDeep(initialValues() || {}));
        }),
      );
      setDataValues(Util.clone(data) as any);
      setResetCounter((count) => count + 1);
    });
    batch(() => {
      (Object.keys(fields()) as FieldName<FormValues>[]).forEach((key) => {
        const metadata = fields()[key];
        const fieldValue = value(key) ?? metadata?.defaultValue;
        // Điểm SEED số 1 của tín hiệu LOCAL — bắt buộc tách khỏi Store, xem detachFromStore.
        metadata?.onValueSet?.(detachFromStore(fieldValue));
      });
    });
  };

  const value = (fieldName: FieldName<FormValues>) => {
    return Util.get(data, fieldName);
  };
  const values = dataValues;

  const clearErrors = () => {
    setFormError();
    setErrors({});
  };
  const clearError = (fieldName: FieldName<FormValues>) => {
    setErrors((_error) => {
      return Util.omit(errors(), [fieldName]) as Partial<FormValues>;
    });
  };

  const setValues: (
    fieldName: FieldName<FormValues>,
    value: any | ((value: any) => any),
  ) => any = (
    fieldName: FieldName<FormValues>,
    value: any | ((value: any) => any),
  ) => {
      const currentData = data;
      const newValue =
        typeof value == 'function'
          ? value(Util.get(currentData, fieldName))
          : value;
      const currentValue = Util.get(currentData, fieldName);
      if (!Util.isEqual(currentValue, newValue)) {
        setData(
          produce((data) => {
            Object.assign(data, Util.set(data, fieldName, newValue));
          }),
        );
        setDataValues(Util.clone(data) as any);
        clearError(fieldName);
        const field = fields()[fieldName];
        if (field) {
          // Điểm SEED số 3 (defense-in-depth) — xem detachFromStore.ts. Hôm nay `newValue`
          // ở đây không thể là 1 Store proxy sống (đã trace hết caller: registerField truyền
          // lại đúng finalValue đã có thể là proxy, Field.tsx/createControl luôn truyền giá
          // trị đã tách), nhưng bọc thêm ở đây phòng 1 lời gọi setValues(name, value(name))
          // trong tương lai vô tình đưa proxy trở lại — chi phí chỉ 1 lần detect + no-op.
          field.onValueSet?.(detachFromStore(newValue));
        }
      }
    };

  const registerField = (
    fieldName: FieldName<FormValues>,
    fieldMetadata: FieldMetadata,
  ) => {
    setFields((prevFields) => ({
      ...prevFields,
      [fieldName]: fieldMetadata,
    }));
    const currentFieldValue = value(fieldName);
    const finalValue = currentFieldValue ?? fieldMetadata.defaultValue;
    // finalValue (chưa tách) vẫn được đưa vào setValues như cũ. LƯU Ý: khi finalValue là 1
    // Store proxy (chế độ SỬA), setValues's `Util.isEqual(currentValue, newValue)` LUÔN thấy
    // "khác" (Reflect.ownKeys của proxy còn kèm symbol nội bộ $PROXY/$NODE của Solid), nên vẫn
    // sinh 1 lượt setData + setDataValues + field.onValueSet thừa ngay lúc đăng ký field (đã
    // verify: KHÔNG tránh được hoàn toàn chỉ bằng cách đặt detach ở onValueSet). Vô hại trên
    // codebase hiện tại — nơi DUY NHẤT dùng form-level onChange (DatatableFilter.tsx) không
    // có initialValues từ 1 bản ghi nên không rơi vào nhánh này — nhưng nếu sau này có form
    // nào dựa vào việc KHÔNG có lượt onChange thừa lúc mount, cần xử lý riêng.
    setValues(fieldName, finalValue);
    // Điểm SEED số 2 của tín hiệu LOCAL — bắt buộc tách khỏi Store, xem detachFromStore.
    fieldMetadata.onValueSet?.(detachFromStore(finalValue));
  };

  const unregisterField = (fieldName: FieldName<FormValues>) => {
    setFields((newFields) => {
      delete newFields[fieldName];
      return newFields;
    });
  };

  const onSubmit = async () => {
    const formFields = fields();
    const formValues = submitValues();
    const errors = await validateForm(formFields, formValues);
    if (Object.keys(errors).length) {
      setErrors(errors);
      return;
    }
    if (isSubmitLocked() || readOnly()) return;
    if (handleSubmit) {
      try {
        setFormError();
        setReadOnly(true);
        setSubmitting(true);
        const transformedValues = purgeTypename(
          transformValues ? transformValues(formValues) : formValues,
        );
        const res = (await handleSubmit(transformedValues)) as FormResult;
        setSubmittedValues(() => transformedValues);
        setSubmittedResult(() => res);
        setSubmitted(true);
        setIsSubmitLocked(true);
        if (afterSubmit) {
          afterSubmit(res);
        }
        return { values: transformedValues, res: res as FormResult };
      } catch (err) {
        setFormError(err as any);
        throw err;
      } finally {
        setReadOnly(false);
        setSubmitting(false);
        setTimeout(() => {
          setIsSubmitLocked(false);
        }, POST_SUBMIT_DELAY);
      }
    }
  };

  const GeneratedForm = (props: GeneratedFormProps<FormValues, FormResult>) => {
    const formClass = () => mergeClass(props.class);
    const [hasInited, setHasInited] = createSignal(false);

    createEffect(() => {
      const newInitialValues = props.initialValues || {};
      untrack(() => {
        setInitialValues(newInitialValues);
        reset();
        setHasInited(true);
      });
    });

    createEffect(() => {
      if (values() && props.onChange) {
        untrack(() => {
          props.onChange!(submitValues(), fields());
        });
      }
    });

    createEffect(() => {
      if (handleError) {
        handleError(formError());
      }
    });

    return (
      <FormContext.Provider
        value={{
          id,
          value: value as any,
          values,
          setValues: setValues as any,
          registerField: registerField as any,
          unregisterField: unregisterField as any,
          submitting,
          submitted,
          submittedValues,
          submittedResult,
          errors,
          setErrors,
          readOnly,
          formError,
          reset,
          resetCounter,
          isSubmitLocked,
        }}
      >
        <form
          autocomplete={props.autoCompleteOff ? 'off' : 'on'}
          class={formClass()}
          onSubmit={async (e) => {
            e.preventDefault();
            const submitResult = await onSubmit();
            if (submitResult) {
              const { values, res } = submitResult;
              props.onSubmitted?.(values, res);
              clearSubmit();
            }
          }}
          onReset={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          <Show when={hasInited()}>{props.children}</Show>
        </form>
      </FormContext.Provider>
    );
  };

  GeneratedForm.Footer = FormFooter;
  GeneratedForm.Fieldset = Fieldset;
  GeneratedForm.Field = Field<FormValues>;
  GeneratedForm.Error = FormError;
  GeneratedForm.Message = FormMessage;

  return {
    Form: GeneratedForm,
    values,
    submitting,
    submitted,
    submittedValues,
    submittedResult,
    readOnly,
    reset,
    isSubmitLocked,
  } as GenerateFormOutput<FormValues, FormResult>;
}

export type FieldMetadata = {
  type: ControlType;
  defaultValue: any;
  nullable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  validate?: {
    required?: boolean;
    text?: FieldValidateText;
    custom?: FieldValidateCustom;
  };
  onValueSet?: (val: any) => any;
};

function purgeTypename<T>(obj: T): T {
  if (isArray(obj as any[])) {
    return (obj as any[]).map(purgeTypename) as T;
  }

  if (isObject(obj as any)) {
    const result = mapValues(obj as any, (value) => purgeTypename(value));
    delete (result as any).__typename;
    return result as T;
  }

  return obj;
}
