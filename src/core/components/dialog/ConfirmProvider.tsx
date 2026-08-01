import { createSignal } from 'solid-js';
import { MODAL_DURATION } from '../modal/ModalProvider';
import { ConfirmDialog, ConfirmProps, ConfirmType } from './Confirm';
import { ConfirmContext } from './ConfirmContext';

export type ConfirmOptions = {
  e?: MouseEvent;
  afterSubmit?: () => any;
} & Partial<ConfirmProps>;

const delayInterval = 10;
const [type, setType] = createSignal<ConfirmType>('info');
const [isConfirmDialogOpen, setIsConfirmDialogOpen] = createSignal<
  MouseEvent | boolean
>();
const [title, setTitle] = createSignal<string | (() => JSX.Element)>('');
const [confirmOptions, setConfirmOptions] = createSignal<ConfirmOptions>();
const [confirmResult, setConfirmResult] = createSignal<boolean>();
const [confirmInterval, setConfirmInterval] = createSignal<number>();

const openConfirm = (
  type: ConfirmType,
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  setType(type);
  setTitle(() => title);
  setConfirmOptions(options);
  setIsConfirmDialogOpen(options?.e || true);
  setConfirmResult();
  return new Promise<boolean>((res, _rej) => {
    const interval = window.setInterval(() => {
      const result = confirmResult();
      if (result !== undefined) {
        clearInterval(confirmInterval());
        res(result);
      }
    }, delayInterval);
    setConfirmInterval(interval);
  });
};

const info = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('info', title, options);
};

const success = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('success', title, options);
};

const warning = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('warning', title, options);
};

const error = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('error', title, options);
};

const caution = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('caution', title, options);
};

const question = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('question', title, options);
};

const danger = async (
  title: string | (() => JSX.Element),
  options?: ConfirmOptions,
) => {
  return openConfirm('danger', title, options);
};

export const confirmAction = () => ({
  info,
  success,
  warning,
  error,
  caution,
  question,
  danger,
});

export function ConfirmProvider(props: BaseProps) {
  const onSubmit = async (e?: MouseEvent) => {
    await confirmOptions()?.onSubmit?.(e);
    setTimeout(() => {
      setConfirmResult(true);
    }, MODAL_DURATION);
  };

  const onCancel = async (e?: MouseEvent) => {
    await confirmOptions()?.onCancel?.(e);
    setTimeout(() => {
      setConfirmResult(false);
    }, MODAL_DURATION);
  };
  return (
    <ConfirmContext.Provider
      value={{ info, success, warning, error, caution, question, danger }}
    >
      <ConfirmDialog
        sm
        {...confirmOptions()}
        type={type()}
        title={title()}
        isOpen={isConfirmDialogOpen()}
        onClose={() => {
          setIsConfirmDialogOpen();
          const result = confirmResult();
          if (result === undefined) {
            setConfirmResult(false);
          } else if (result) {
            confirmOptions()?.afterSubmit?.();
          }
          setTimeout(() => {
            setConfirmResult();
          }, MODAL_DURATION);
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
      {props.children}
    </ConfirmContext.Provider>
  );
}
