import { mergeClass } from '@core/helpers/class';
import { Dom } from '@core/helpers/dom';
import { CSSProperties } from '@core/types/jsx';
import {
  Index,
  batch,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal, setAttribute } from 'solid-js/web';
import { ModalOptions } from './Modal';

export interface ModalProviderProps extends BaseProps {
  overlayClass?: string;
}
export type ModalState =
  | 'hidden'
  | 'opening'
  | 'visible'
  | 'transitioning'
  | 'closing';

export const MODAL_CONTENT_ID = 'MainModalContentWrapper';
let contentRef: HTMLDivElement;

export const MODAL_DURATION = 300;
export const TRANSITION_DELAY = 50;
export const ACTIVE_DELAY = 50;
const [mainModals, setMainModals] = createStore<ModalOptions[]>([]);
const [subModals, setSubModals] = createStore<ModalOptions[]>([]);
const [modalState, setModalState] = createSignal<ModalState>('hidden');
const [subModalStates, setSubModalStates] = createSignal<{
  [key: string]: 'hidden' | 'opening' | 'visible' | 'closing';
}>({});
const [wrapperStyle, setWrapperStyle] = createSignal<CSSProperties>();
const [contentStyle, setContentStyle] = createSignal<CSSProperties>();
const [subOverlayStyle, setSubOverlayStyle] = createSignal<CSSProperties>();

export const getModals = () => mainModals;
export const getSubModals = () => subModals;
export const activeModal = () =>
  mainModals.length ? mainModals[mainModals.length - 1] : null;
export const activeSubModal = () =>
  subModals.length ? subModals[subModals.length - 1] : null;

export const openModal = (options: ModalOptions) => {
  if (isModalInteractionBlocked()) return;
  if (
    mainModals.find((modal) => modal.id == options.id) ||
    subModals.find((modal) => modal.id == options.id)
  )
    return;
  Dom.blurActiveElement();

  const isSubModal =
    options.mode == 'sub' ? (mainModals.length ? true : false) : false;

  if (isSubModal) {
    setSubOverlayStyle({});
    setSubModals(subModals.length, options);
    setSubModalStates((states) => ({
      ...states,
      [options.id]: 'opening',
    }));
    setTimeout(() => {
      setSubModalStates((states) => ({
        ...states,
        [options.id]: 'visible',
      }));
    }, MODAL_DURATION);
  } else {
    batch(() => {
      if (mainModals.length) {
        setModalState('transitioning');
        initTransition();
        setTimeout(() => {
          setModalState('visible');
        }, MODAL_DURATION);
      } else {
        setModalState('opening');
        setTimeout(() => {
          setModalState('visible');
        }, MODAL_DURATION);
      }
      setMainModals(mainModals.length, options);
    });
  }
};
export const closeModal = (id: string | undefined) => {
  if (!mainModals.length || isModalInteractionBlocked()) return;
  Dom.blurActiveElement();

  if (activeModal()?.id === id) {
    batch(() => {
      // when close a dialog, depends on if it's closing
      // or transitioning to a previous dialog, the time
      // for removing the dialog will be different
      if (mainModals.length == 1) {
        setModalState('closing');
      } else {
        // when transitioning, swap the dialog immediately
        // in order to get the next dialog size and position
        setModalState('transitioning');
        initTransition();
        const newMainModals = mainModals.slice();
        const deletedItems = newMainModals.splice(newMainModals.length - 1, 1);
        const deletedItem = deletedItems[0];
        deletedItem?.onClose?.();
        setMainModals(newMainModals);
      }
      activeModal()?.onClosing?.();
      setTimeout(() => {
        if (modalState() == 'transitioning') {
          setModalState('visible');
        } else if (modalState() == 'closing') {
          // in case of closing, delay removing until the dialog is fully hidden
          setModalState('hidden');
          const newMainModals = mainModals.slice();
          const deletedItems = newMainModals.splice(
            newMainModals.length - 1,
            1,
          );
          deletedItems.forEach((item) => item?.onClose?.());

          setMainModals(newMainModals);
        }
      }, MODAL_DURATION);
    });
  } else {
    const mainModalIndex = mainModals.findIndex((modal) => modal.id == id);
    if (mainModalIndex >= 0) {
      const newMainModals = mainModals.slice();
      newMainModals.splice(mainModalIndex, 1);
      setMainModals(newMainModals);
    } else {
      const subModalIndex = subModals.findIndex((modal) => modal.id == id);
      if (subModalIndex >= 0) {
        const subModal = subModals[subModalIndex];
        subModal.onClosing?.();
        setSubModalStates((states) => ({
          ...states,
          [subModal.id]: 'closing',
        }));
        setTimeout(() => {
          subModal.onClose?.();
          setSubModalStates((states) => ({
            ...states,
            [subModal.id]: 'hidden',
          }));
          const newSubModals = subModals.slice();
          newSubModals.splice(newSubModals.length - 1, 1);
          setSubModals(newSubModals);
          // setSubOverlayStyle();
        }, MODAL_DURATION);
      }
    }
  }
};
export const closeAllModals = () => {
  if (!mainModals.length || isModalInteractionBlocked()) return;
  Dom.blurActiveElement();

  batch(() => {
    if (subModals.length) {
      setSubModalStates((states) =>
        Object.keys(states).reduce(
          (obj, key) => ({
            ...obj,
            [key]: 'closing',
          }),
          {},
        ),
      );
      setTimeout(() => {
        setSubModals([]);
        setSubModalStates((states) =>
          Object.keys(states).reduce(
            (obj, key) => ({
              ...obj,
              [key]: 'hidden',
            }),
            {},
          ),
        );
      }, MODAL_DURATION);
    }

    setModalState('closing');
    activeModal()?.onClosing?.();
    setTimeout(() => {
      setModalState('hidden');
      const newMainModals = mainModals.slice();
      const deletedItems = newMainModals.splice(0, newMainModals.length);
      setMainModals(newMainModals);
      deletedItems.forEach((item) => item?.onClose?.());
    }, MODAL_DURATION);
  });
};
/** Copy the size and position of the dialog to the transition wrapper */
const initTransition = () => {
  const contentEl = contentRef;
  const offset = Dom.getOffset(contentEl);
  setWrapperStyle({
    width: contentEl.offsetWidth + 'px',
    height: contentEl.offsetHeight + 'px',
    top: offset.top + 'px',
    left: offset.left + 'px',
  });
};

/** Apply the new size and position of the new dialog to the transition wrapper */
const startTransition = () => {
  const contentEl = contentRef;
  const offset = Dom.getOffset(contentEl);
  setWrapperStyle({
    width: contentEl.offsetWidth + 'px',
    height: contentEl.offsetHeight + 'px',
    top: offset.top + 'px',
    left: offset.left + 'px',
  });
};

/** Hide the transition wrapper */
const closeTransition = () => {
  setWrapperStyle(undefined);
};

const isModalInteractionBlocked = () => {
  if (
    modalState() == 'opening' ||
    modalState() == 'transitioning' ||
    modalState() == 'closing'
  ) {
    return true;
  } else {
    const subModalState = subModals.length
      ? subModalStates()[subModals[subModals.length - 1].id]
      : undefined;
    if (subModalState == 'opening' || subModalState == 'closing') {
      return true;
    }
    return false;
  }
};

export function ModalProvider(props: ModalProviderProps) {
  createEffect(() => {
    if (modalState() == 'transitioning') {
      untrack(() => {
        setTimeout(() => {
          startTransition();
        });
      });
    } else if (modalState() == 'visible') {
      untrack(() => {
        setTimeout(() => {
          closeTransition();
        }, MODAL_DURATION);
      });
    }
  });

  const overlayClass = () =>
    mergeClass(
      'fixed w-full h-full top-0 left-0 z-100',
      'bg-dark/50 transition ease-in-out duration-300 backdrop-blur-xs',
      (modalState() == 'visible' || modalState() == 'opening') && 'opacity-100',
      modalState() == 'closing' && 'opacity-0',
      modalState() == 'hidden' && 'opacity-0 pointer-events-none',
      props.overlayClass,
    );

  const containerClass = () => {
    const position = activeModal()?.position;
    const screenGap = activeModal()?.screenGap;
    return mergeClass(
      'fixed top-0 left-0 flex flex-col w-full h-screen z-100',
      'scrollbar-hidden overflow-y-scroll',
      modalState() == 'hidden' && 'pointer-events-none',
      screenGap == 'none'
        ? `px-0 py-0`
        : position == 'left' || position == 'right'
          ? 'px-3 pt-8 pb-8'
          : position == 'bottom'
            ? 'px-3 pt-8 pb-8'
            : position == 'top'
              ? 'px-4 pt-8 pb-16 '
              : 'px-3 pt-8 pb-8',
      position == 'left'
        ? 'items-start'
        : position == 'right'
          ? 'items-end'
          : 'items-center',
    );
  };

  const wrapperClass = () => {
    return mergeClass(
      'absolute w-full h-full origin-center transition-all duration-300 ease-in-out',
      activeModal()?.class,
    );
  };

  createEffect(() => {
    const contentEl = contentRef;
    const state = modalState();
    untrack(() => {
      if (state == 'opening') {
        // Wait for the element to render then calculate the transform origin if event
        setTimeout(() => {
          const isOpen = activeModal()?.isOpen;
          if (isOpen instanceof MouseEvent) {
            const event = isOpen;
            const x = event.clientX;
            const y = event.clientY;

            const offset = Dom.getOffset(contentEl);

            setContentStyle({
              // fixed floating UI like dropdown will calculate position based on viewport
              // unless there are wrapper parent with transform, filter, perspective in the acestors there
              // the following filter is a non-effect properties to force floating ui to start off calculating based on the modal wrapper
              // after the modal is rendered, a transform property was applied which cause the initial floating calculation to be incorrect
              // previously in Tailwind3 it does seem to apply something by default, this is to fix the issue in Tailwind4
              filter: 'blur(0)',
              'transform-origin': `${x - offset.left + contentEl.offsetWidth / 2
                }px ${y - offset.top + contentEl.offsetHeight / 2}px`,
              ...modalContentStyle(),
            });
          } else {
            setContentStyle({
              ...modalContentStyle(),
            });
            setAttribute(contentEl, 'transform-origin', '');
          }
        }, TRANSITION_DELAY);
      } else if (state == 'hidden') {
        const contentEl = contentRef;
        if (contentEl) {
          setContentStyle({
            ...modalContentStyle(),
          });
          setAttribute(contentEl, 'transform-origin', '');
        }
      }
    });
  });

  const [initialClass, setInitialClass] = createSignal('');
  const [postInitialClass, setPostInitialClass] = createSignal('');
  const [transitionClass, setTransitionClass] = createSignal('');
  const [transitioningClass, setTransitioningClass] = createSignal('');
  const [inactiveClass, setInactiveClass] = createSignal('');
  const [activeClass, setActiveClass] = createSignal('');
  createEffect(() => {
    const currentModal = activeModal();
    if (currentModal) {
      setInitialClass(
        currentModal.initialClass || 'scale-0 opacity-0 origin-center',
      );
      setTransitioningClass(
        currentModal.transitioningClass || `duration-0 opacity-0 scale-100`,
      );
      setInactiveClass(
        currentModal.inactiveClass || `scale-0 opacity-0 blur-md`,
      );
      setTimeout(() => {
        setPostInitialClass(currentModal.postInitialClass || ``);
      });
      setTimeout(() => {
        setTransitionClass(
          currentModal.transitionClass || `transition ease-in-out duration-300`,
        );
      }, TRANSITION_DELAY);
      setTimeout(() => {
        setActiveClass(
          currentModal.activeClass || `scale-100 opacity-100 blur-0`,
        );
      }, ACTIVE_DELAY);
    } else {
      setInitialClass('');
      setTransitionClass('');
      setTransitioningClass('');
      setInactiveClass('');
      setActiveClass('');
    }
  });

  const modalContentStyle = () => ({
    ...activeModal()?.style,
  });
  const contentClass = () => {
    const position = activeModal()?.position;
    return mergeClass(
      'relative w-fit h-fit max-w-full',
      'after:pointer-events-none after:transition-opacity after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-white/75 after:rounded-inherit',
      position == 'bottom'
        ? 'mt-auto'
        : position == 'left' || position == 'right' || position == 'top'
          ? 'mb-auto'
          : 'my-auto',
      initialClass(),
      postInitialClass(),
      transitionClass(),
      activeClass(),
      modalState() == 'transitioning' && transitioningClass(),
      (modalState() == 'closing' || modalState() == 'hidden') &&
      inactiveClass(),
      subModals.length &&
      (subModalStates()[subModals[0].id] == 'opening' ||
        subModalStates()[subModals[0].id] == 'visible') &&
      'after:opacity-100 after:pointer-events-auto',
      (!subModals.length ||
        (subModals.length &&
          (subModalStates()[subModals[0].id] == 'closing' ||
            subModalStates()[subModals[0].id] == 'hidden'))) &&
      'after:opacity-0',
      activeModal()?.class,
      activeModal()?.screenGap == 'none'
        ? `${position == 'left' ? 'rounded-l-none' : position == 'right' ? 'rounded-r-none' : ''}`
        : '',
    );
  };

  const subOverlayClass = () => {
    const position = activeSubModal()?.position;
    const screenGap = activeSubModal()?.screenGap;
    return mergeClass(
      'fixed flex flex-col z-200 pointer-events-none transition',
      'w-full h-dvh top-0 left-0 overflow-y-auto scrollbar-hidden',
      screenGap == 'none'
        ? `px-0 py-0`
        : position == 'left' || position == 'right'
          ? 'px-4 pt-16 pb-8'
          : position == 'bottom'
            ? 'px-4 pt-16 pb-4'
            : 'px-3 pt-8 pb-8',
      position == 'left'
        ? 'items-start'
        : position == 'right'
          ? 'items-end'
          : 'items-center',
      position == 'top'
        ? 'justify-start'
        : position == 'bottom'
          ? 'justify-end'
          : 'justify-center',
      subModals.length &&
      (subModalStates()[subModals[0].id] == 'opening' ||
        subModalStates()[subModals[0].id] == 'visible') &&
      'opacity-100 pointer-events-auto',
      (!subModals.length ||
        (subModals.length &&
          (subModalStates()[subModals[0].id] == 'closing' ||
            subModalStates()[subModals[0].id] == 'hidden'))) &&
      'opacity-0',
    );
  };

  const subWrapperClass = (id: string) => {
    const index = subModals.findIndex((subModal) => subModal.id === id);
    const nextIndex = index + 1;
    const currentSubModal = subModals[index];
    const nextSubModal = subModals[nextIndex];
    // TODO: position isn't what it should be.
    const position = currentSubModal.position;
    const screenGap = currentSubModal.screenGap;

    return mergeClass(
      'relative max-w-full transition duration-300 border shadow-lg shadow-light border-neutral-100 border-t-neutral-100 border-b-neutral-200',
      'after:pointer-events-none after:transition-opacity after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-white/75 after:rounded-inherit',
      position == 'bottom'
        ? 'mt-auto'
        : position == 'left' || position == 'right' || position == 'top'
          ? 'mb-auto'
          : 'my-auto',
      screenGap == 'none'
        ? `${position == 'left' ? 'rounded-l-none' : position == 'right' ? 'rounded-r-none' : ''}`
        : '',
      (subModalStates()[id] == 'opening' ||
        subModalStates()[id] == 'visible') &&
      'animate-scale-in-center blur-0',
      (subModalStates()[id] == 'closing' ||
        subModalStates()[id] == 'hidden' ||
        !subModalStates()[id]) &&
      'animate-scale-out-center blur-xs',
      nextSubModal &&
      (subModalStates()[nextSubModal.id] == 'opening' ||
        subModalStates()[nextSubModal.id] == 'visible') &&
      'after:opacity-100 after:pointer-events-auto',
      (!nextSubModal ||
        (nextSubModal &&
          (subModalStates()[nextSubModal.id] == 'closing' ||
            subModalStates()[nextSubModal.id] == 'hidden'))) &&
      'after:opacity-0',
      currentSubModal?.class,
    );
  };

  const [subModalWrapperStyles, setSubModalWrapperStyles] = createSignal<any>(
    {},
  );
  createEffect(() => {
    const subModal = activeSubModal();
    if (!subModal) return;

    const state = subModalStates()[subModal.id];
    untrack(() => {
      const contentEl = document.getElementById(
        `${subModal.id}SubModalContentWrapper`,
      );
      if (!contentEl) return;
      if (state == 'opening') {
        // Wait for the element to render then calculate the transform origin if event
        setTimeout(() => {
          const isOpen = subModal.isOpen;
          if (isOpen instanceof MouseEvent) {
            const event = isOpen;
            const x = event.clientX;
            const y = event.clientY;

            const offset = Dom.getOffset(contentEl);

            setSubModalWrapperStyles((styles: any) => {
              styles[subModal.id] = {
                'transform-origin': `${x - offset.left + contentEl.offsetWidth / 2
                  }px ${y - offset.top + contentEl.offsetHeight / 2}px`,
              };
              return { ...styles };
            });
          } else {
            setSubModalWrapperStyles((styles: any) => {
              styles[subModal.id] = {};
              return { ...styles };
            });
            setAttribute(contentEl, 'transform-origin', '');
          }
        }, TRANSITION_DELAY);
      } else if (state == 'hidden') {
        const contentEl = contentRef;
        if (contentEl) {
          setSubModalWrapperStyles((styles: any) => {
            styles[subModal.id] = {};
            return { ...styles };
          });
          setAttribute(contentEl, 'transform-origin', '');
        }
      }
    });
  });

  let scrollTop: number | undefined;
  createEffect(() => {
    const html = document.querySelector('html');
    if (!html) return;
    //lock scroll on opening and unlock on hidden
    if (modalState() === 'opening') {
      scrollTop = html.scrollTop;
      html.style.width = '100%';
      html.style.overflowY =
        html.scrollHeight > html.clientHeight ? 'scroll' : 'hidden';
      html.style.position = 'fixed';
      html.style.top = `-${scrollTop}px`;
    } else if (modalState() === 'hidden') {
      html.style.width = 'initial';
      html.style.overflowY = 'auto';
      html.style.position = 'initial';
      if (scrollTop) {
        html.scroll(0, scrollTop);
        scrollTop = undefined;
      }
    }
  });

  const [isContainerMouseDown, setIsContainerMouseDown] = createSignal(false);
  const [isSubContainerMouseDown, setIsSubContainerMouseDown] =
    createSignal(false);
  const onMouseUp = () => {
    setIsContainerMouseDown(false);
    setIsSubContainerMouseDown(false);
  };
  const onContentResize = () => {};
  const onPopState = () => {
    closeAllModals();
  };
  onMount(() => {
    document.addEventListener('mouseup', onMouseUp);
    contentRef.addEventListener('resize', onContentResize);
    window.addEventListener('resize', onContentResize);
    window.addEventListener('popstate', onPopState);
  });
  onCleanup(() => {
    document.removeEventListener('mouseup', onMouseUp);
    contentRef?.removeEventListener('resize', onContentResize);
    window.removeEventListener('resize', onContentResize);
    window.removeEventListener('popstate', onPopState);
  });

  const root = Dom.getRoot('modals');
  return (
    <Portal mount={root}>
      <div class={overlayClass()}></div>
      <div
        class={containerClass()}
        onMouseDown={() => {
          if (activeSubModal()) {
            setIsSubContainerMouseDown(true);
          } else {
            setIsContainerMouseDown(true);
          }
        }}
        onMouseUp={(e) => {
          if (activeSubModal()) {
            if (isSubContainerMouseDown()) {
              if (
                !!activeSubModal() &&
                e.target === e.currentTarget &&
                activeSubModal()?.shouldCloseOnOverlayClick !== false
              ) {
                closeModal(activeSubModal()?.id);
              }
            }
          } else {
            if (isContainerMouseDown()) {
              if (
                e.target === e.currentTarget &&
                activeModal()?.shouldCloseOnOverlayClick !== false
              ) {
                if (activeSubModal()) {
                  closeModal(activeSubModal()?.id);
                } else if (activeModal()) {
                  closeModal(activeModal()?.id);
                }
              }
            }
          }
        }}
      >
        {wrapperStyle() && (
          <div class={wrapperClass()} style={wrapperStyle()}></div>
        )}
        <div
          id={MODAL_CONTENT_ID}
          ref={(el) => (contentRef = el)}
          class={contentClass()}
          style={contentStyle()}
        ></div>
        <div
          class={subOverlayClass()}
          style={subOverlayStyle()}
          onMouseDown={() => {
            setIsContainerMouseDown(true);
          }}
          onMouseUp={(e) => {
            if (isSubContainerMouseDown()) {
              if (
                !!activeSubModal() &&
                e.target === e.currentTarget &&
                activeSubModal()?.shouldCloseOnOverlayClick !== false
              ) {
                closeModal(activeSubModal()?.id);
              }
            }
          }}
        >
          <Index each={subModals}>
            {(item) => (
              <div
                id={`${item().id}SubModalContentWrapper`}
                class={subWrapperClass(item().id)}
                style={subModalWrapperStyles()[item().id]}
              ></div>
            )}
          </Index>
        </div>
      </div>
    </Portal>
  );
}
