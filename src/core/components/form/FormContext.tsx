import { Accessor, Setter, createContext, useContext } from 'solid-js';
import { FieldMetadata } from './generateForm';

type FormContext = {
  id: string;
  value: (field: string) => any;
  values: () => any;
  registerField: (fieldName: string, fieldMetadata: FieldMetadata) => any;
  unregisterField: (fieldName: string) => any;
  submitting: Accessor<boolean>;
  submitted: Accessor<boolean>;
  submittedValues: Accessor<any>;
  submittedResult: Accessor<any>;
  errors: Accessor<any>;
  setErrors: Setter<any>;
  formError: Accessor<Error | undefined>;
  readOnly: Accessor<boolean>;
  resetCounter: Accessor<number>;
  isSubmitLocked: Accessor<boolean>;
  setValues: (field: string, value: any | ((value: any) => any)) => any;
  reset: () => void;
};
export const FormContext = createContext<FormContext>();
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    return {
      id: '',
      value: (_field: any) => undefined,
      values: () => { },
      registerField: (_fieldName: any, _fieldMetadata: any) => { },
      unregisterField: (_fieldName: any) => { },
      submitting: () => false,
      submitted: () => false,
      submittedValues: () => null,
      submittedResult: () => null,
      errors: () => { },
      setErrors: () => { },
      formError: () => { },
      readOnly: () => false,
      resetCounter: () => { },
      isSubmitLocked: () => false,
      setValues: (_field: any, _value: any) => { },
      reset: () => { },
    } as FormContext;
  }
  return context;
};
