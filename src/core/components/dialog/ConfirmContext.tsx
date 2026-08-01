import { createContext, useContext } from 'solid-js';
import { ConfirmOptions } from './ConfirmProvider';

export const ConfirmContext = createContext<{
  info: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  success: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  warning: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  error: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  caution: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  question: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
  danger: (
    title: string | (() => JSX.Element),
    options?: ConfirmOptions,
  ) => Promise<boolean>;
}>();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw Error('No Confirm Context!');
  return context;
};
