import { Accessor, createContext, useContext } from 'solid-js';
import { ControlMetadata } from './Field';

export const FieldContext = createContext<{
  id: string;
  name: Accessor<string>;
  value: Accessor<any>;
  setValue: (val: any) => any;
  readOnly: Accessor<boolean>;
  disabled: Accessor<boolean>;
  error: Accessor<string>;
  clearError: () => any;
  hasForm: boolean;
  control: Accessor<ControlMetadata | undefined>;
  registerControl: (control: ControlMetadata) => any;
}>();

export const useField = () => useContext(FieldContext);
