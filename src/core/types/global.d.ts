import { FocusEventHandler } from './jsx';

export {};

declare global {
  interface BaseProps {
    id?: string;
    class?: string;
    children?: any | JSX.Element;
    style?: JSX.CSSProperties;
  }

  interface ServerError {
    code: string;
    message: string;
  }

  interface Option<T = any, R = any> {
    value: any;
    label: string;
    subText?: string;
    group?: string;
    image?: string;
    icon?: string;
    className?: string;
    disabled?: boolean;
    data?: R;
    color?: Color;
    col?: Col;
  }

  type Color = SemanticColor | PaletteColor | (string & {});

  type SemanticColor =
    | 'brand'
    | 'main'
    | 'sub'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
    | 'special'
    | 'neutral'
    | 'white'
    | 'black';

  type PaletteColor =
    | 'red'
    | 'orange'
    | 'yellow'
    | 'lime'
    | 'green'
    | 'teal'
    | 'cyan'
    | 'blue'
    | 'indigo'
    | 'purple'
    | 'pink'
    | 'rose'
    | 'beige'
    | 'slate';

  interface FormControlProps<T = any> extends BaseProps {
    value?: T;
    onChange?: (val: T) => void;
    defaultValue?: T;
    id?: string;
    name?: string;
    placeholder?: string;
    /**
     * Prevent user to interact but the data will still be submitted.
     */
    readOnly?: boolean;
    /**
     * Prevent interaction similar to readOnly but the data won't be submitted
     */
    disabled?: boolean;
    error?: string;
    /**
     * By default all form control can be tabbed into through keyboard, set to true will skip tab.
     */
    skipTabIndex?: boolean;
    /** It will not registered value to a field inside form.
     * And behaves independent on its own value params.
     */
    fieldless?: boolean;
    /** focus event */
    onFocus?: FocusEventHandler<HTMLElement, FocusEvent>;
    onBlur?: FocusEventHandler<HTMLElement, FocusEvent>;
    /** Keyboard event */
    onKeyDown?: (e: KeyboardEvent) => any;
    nullable?: boolean;
  }

  type Col = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

  // declare function t(literals: TemplateStringsArray | MessageDescriptor ...placeholders: any[]): string;

  type Placement =
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top-start'
    | 'top-end'
    | 'right-start'
    | 'right-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end';

  type AtLeastOne<T> = { [K in keyof T]: Pick<T, K> }[keyof T];
  type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
}
