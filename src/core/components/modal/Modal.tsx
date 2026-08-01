import {
  MODAL_CONTENT_ID,
  activeModal,
  closeModal,
  getSubModals,
  openModal,
} from '@core/components/modal/ModalProvider';
import { mergeClass } from '@core/helpers/class';
import { generateId } from '@core/helpers/util';
import { CSSProperties } from '@core/types/jsx';
import {
  Accessor,
  ErrorBoundary,
  Show,
  createEffect,
  createSignal,
  splitProps,
  untrack,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { ModalContext } from './ModalContext';

export interface ModalProps
  extends Omit<BaseProps, 'id'>,
    ModalOptions,
    ModalSizeProps {}
export interface ModalOptions {
  id: string;
  isOpen: boolean | MouseEvent | undefined;
  onClose: () => any;
  onClosing?: () => any;
  position?: 'center' | 'top' | 'bottom' | 'right' | 'left';
  screenGap?: 'default' | 'none';
  /** Declare class related to the dialog wrapper like background, shadow, corner radius
   * It applies on both the dialog and the transition wrapper
   */
  class?: string;
  style?: CSSProperties;
  /** The default state when the dialog initiated */
  initialClass?: string;
  /** The class after initial class, without animation */
  postInitialClass?: string;
  /** The active animation transition */
  activeClass?: string;
  /** The transition class, define the start of the animation */
  transitionClass?: string;
  /** The transitioning state, animation not required */
  transitioningClass?: string;
  /** The closing animation state into the initial state */
  inactiveClass?: string;
  /** Main modal only appear one at a time, sub modal appears in center of current dialog or at their own */
  mode?: 'main' | 'sub';
  /** If enabled, clicking on outside the dialog won't close it */
  shouldCloseOnOverlayClick?: boolean;
  // scrollable?: boolean;
  /* skip observer size change for specific type of dialog such as image */
  // shouldSkipObserver?: boolean;
  // closeOnOverlayClick?: boolean;
  containerClass?: string;
}
interface ModalSizeProps {
  /* 320px */
  xs?: boolean;
  /* 448px */
  xsm?: boolean;
  /* 480px */
  sm?: boolean;
  /* 640px */
  smd?: boolean;
  /* 768px */
  md?: boolean;
  /* 1024px */
  lg?: boolean;
  /* 1280px */
  xl?: boolean;
  /* 1440px */
  xl2?: boolean;
  /* rem */
  width?: number;
  /** Determinine if dialog is scroll when its height exceeds the screen height */
  scrollable?: boolean;
}
export function Modal(props: ModalProps) {
  const id = props.id || generateId();
  const mode = () => props.mode || 'sub';
  const [isClosing, setIsClosing] = createSignal(false);

  const containerClass = () =>
    mergeClass(
      `relative bg-inherit rounded-inherit flex-column flex-auto min-h-0 overflow-hidden`,
      props.containerClass,
    );
  const modalClass = () =>
    mergeClass(
      'flex-column bg-white rounded-xl',
      !props.scrollable
        ? props.screenGap === 'none'
          ? `max-h-dvh`
          : `max-h-[calc(100dvh_-_6rem)]`
        : ``,
      props.xl2
        ? 'w-8xl'
        : props.xl
          ? 'w-7xl'
          : props.lg
            ? 'w-5xl'
            : props.sm
              ? 'w-sm'
              : props.xs
                ? 'w-xs'
                : props.md
                  ? 'w-3xl'
                  : props.smd
                    ? 'w-2xl'
                    : props.xsm
                      ? 'w-md'
                      : 'w-sm',
      props.class,
    );

  const modalStyle = () => ({
    ...(props.width ? { width: props.width + 'rem' } : {}),
    ...props.style,
  });

  const onClosing = () => {
    setIsClosing(true);
    props.onClosing?.();
  };

  const onClose = () => {
    setIsClosing(false);
    props.onClose?.();
  };

  const modalOptions = () =>
    ({
      ...splitProps(props, [
        'id',
        'isOpen',
        'position',
        'screenGap',
        'initialClass',
        'postInitialClass',
        'activeClass',
        'transitionClass',
        'transitioningClass',
        'inactiveClass',
        'shouldCloseOnOverlayClick',
        'scrollable',
      ])[0],
      onClosing,
      onClose,
      isClosing,
      mode: mode(),
      class: modalClass(),
      style: modalStyle(),
    }) as ModalOptions & { isClosing: Accessor<boolean> };

  createEffect(() => {
    if (props.isOpen) {
      untrack(() => {
        openModal(modalOptions());
      });
    } else {
      untrack(() => {
        closeModal(id);
      });
    }
  });
  const modalContentEl = () => {
    if (activeModal()?.id === id) {
      return document.getElementById(MODAL_CONTENT_ID);
    } else {
      return document.getElementById(`${id}SubModalContentWrapper`);
    }
  };

  const isRendered = () => {
    return (
      activeModal()?.id === id ||
      !!getSubModals().find((subModal) => subModal.id === id)
    );
  };

  // let containerRef: HTMLDivElement?
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  createEffect(() => {
    if (containerClass())
      containerRef()?.classList.add(...containerClass().trim().split(' '));
  });

  return (
    <Show when={isRendered()}>
      <Portal mount={modalContentEl() as Node} ref={setContainerRef}>
        <ModalContext.Provider value={modalOptions()}>
          <ErrorBoundary
            fallback={(err) => {
              console.error(err);
              return <div class="p-12">{err.toString()}</div>;
            }}
          >
            <Show when={!!props.isOpen || isClosing()}>{props.children}</Show>
          </ErrorBoundary>
        </ModalContext.Provider>
      </Portal>
    </Show>
  );
}
