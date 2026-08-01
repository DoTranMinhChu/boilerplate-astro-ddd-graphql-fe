import { writeClipboard } from '@solid-primitives/clipboard';
import { apiRequestWithToast } from '@core/helpers/api';
import { checkMobileOrTablet } from '@core/helpers/device';
import { generateId } from '@core/helpers/util';
import { createEffect, createSignal } from 'solid-js';
import toastr, {
  ToastOptions,
  Toast as ToastState,
  Toaster,
} from 'solid-toast';
import { Toast, ToastProps } from './Toast';
import { ToastContext } from './ToastContext';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
const [defaultDesktopPosition, setDefaultDesktopPosition] =
  createSignal<ToastPosition>('top-right');

export interface ToastProviderProps extends BaseProps {
  defaultDesktopPosition?: ToastPosition; // top-right on desktop, top-center on mobile
}
const OFFSET_THRESHOLD = 120;
export function ToastProvider(props: ToastProviderProps) {
  const [screenOffset, setScreenOffset] = createSignal(
    screen.height - window.innerHeight,
  );
  const isMobileOrTablet = checkMobileOrTablet();

  if (props.defaultDesktopPosition) {
    setDefaultDesktopPosition(props.defaultDesktopPosition);
  }

  const marginTop = () => {
    if (isMobileOrTablet && screenOffset() < OFFSET_THRESHOLD) {
      return OFFSET_THRESHOLD - screenOffset();
    }
    return 0;
  };

  const onResize = () => {
    const innerHeight = window.innerHeight;
    const screenHeight = screen.height;
    setScreenOffset(screenHeight - innerHeight);
  };

  createEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onResize();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {props.children}
      <Toaster
        containerStyle={{
          'margin-top': marginTop() + 'px',
        }}
      />
    </ToastContext.Provider>
  );
}

export type ToasterOptions = Pick<
  ToastOptions,
  'duration' | 'id' | 'position' | 'unmountDelay'
>;

export const showToast: (
  component: (t: ToastState) => JSX.Element,
  options?: ToasterOptions,
) => void = (component, options) => {
  const isMobileOrTablet = checkMobileOrTablet();
  toastr.custom(component, {
    ...options,
    position:
      options?.position ||
      (isMobileOrTablet ? 'top-center' : defaultDesktopPosition()),
  });
};

export const dismissToast = (id: string) => {
  toastr.dismiss(id);
};

export type ShowToastAction = (
  title: string | JSX.Element,
  content?: string | JSX.Element,
  options?: ToastProps & ToasterOptions,
) => void;

const getToasterOptions = (options?: ToastProps & ToasterOptions) => {
  const { duration, id, position, unmountDelay } = options || {};
  const toasterOptions: ToasterOptions = {
    id: id || generateId(),
    duration: duration || 3500,
    position,
    unmountDelay: unmountDelay || 0,
  };

  return toasterOptions;
};

export const toast = () => ({
  api: apiRequestWithToast,
  copy: (text: string, message?: string) => {
    writeClipboard(text).then(() => {
      toast().info(message || 'Sao chép thành công');
    });
  },
  custom: (
    component: (t: ToastState) => JSX.Element,
    options: ToasterOptions,
  ) => {
    showToast(component, getToasterOptions(options));
  },
  show: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast t={t} id={id} title={title} content={content} {...options} />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  info: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'info'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  success: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'success'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  warning: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'warning'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  danger: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'danger'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  special: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'special'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
  main: ((title, content, options) => {
    const id = generateId();
    showToast(
      (t) => (
        <Toast
          t={t}
          id={id}
          type={'main'}
          title={title}
          content={content}
          {...options}
        />
      ),
      getToasterOptions({ ...options, id }),
    );
  }) as ShowToastAction,
});
