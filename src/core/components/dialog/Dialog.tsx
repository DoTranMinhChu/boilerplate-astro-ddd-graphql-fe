import { Button, ButtonProps } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import { Modal, ModalProps } from '@core/components/modal/Modal';
import { useModal } from '@core/components/modal/ModalContext';
import { closeModal, getModals } from '@core/components/modal/ModalProvider';
import { mergeClass } from '@core/helpers/class';
import { createScreen } from '@core/helpers/screen';
import { generateId } from '@core/helpers/util';
import { ButtonGroup, ButtonGroupProps } from '../button/ButtonGroup';

export interface DialogProps extends ModalProps {
  /** Default: none */
  bottomSheetMode?: 'none' | 'auto' | 'always';
}
export function Dialog(props: DialogProps) {
  const { fromSm } = createScreen();
  const isMobileScreen = () => !fromSm();
  const bottomSheetMode = () =>
    props.bottomSheetMode || (props.mode == 'main' ? 'auto' : 'none');
  const isBottomSheet = () =>
    bottomSheetMode() == 'none'
      ? false
      : bottomSheetMode() == 'always'
        ? true
        : isMobileScreen();
  const position = () => (isBottomSheet() ? 'bottom' : props.position);

  return (
    <Modal
      {...props}
      position={position()}
      {...(isBottomSheet()
        ? {
            class: `w-screen rounded-b-none ${props.class}`,
            screenGap: 'none',
            initialClass: `opacity-0 origin-bottom`,
            postInitialClass: `opacity-100 translate-y-full`,
            transitioningClass: `duration-0 opacity-0 scale-100`,
            transitionClass: `transition opacity-100 duration-300`,
            inactiveClass: `blur-md translate-y-full`,
            activeClass: `opacity-100 blur-0 translate-y-0`,
          }
        : {})}
    >
      {props.children}
    </Modal>
  );
}

export interface DialogHeaderProps extends BaseProps {
  title?: string | JSX.Element;
  titleClass?: string;
  hasBack?: boolean;
  backButtonProps?: ButtonProps;
  hasClose?: boolean;
  closeButtonProps?: ButtonProps;
}
export function DialogHeader(props: DialogHeaderProps) {
  const { id, mode, scrollable } = useModal();
  const dialogs = getModals();
  const hasBack = () => mode == 'main' && dialogs.length > 1;
  const hasClose = () => props.hasClose ?? true;

  const headerClass = () =>
    mergeClass(
      'relative flex items-center px-3 py-2 rounded-t-inherit',
      'border-b border-neutral-50',
      scrollable ? 'sticky flex-0 top-0' : 'flex-shrink-0',
      props.class,
    );

  const titleClass = () =>
    mergeClass(
      'flex-1 pl-1 font-medium text-base text-neutral',
      props.titleClass,
    );

  return (
    <div class={headerClass()} style={props.style}>
      {hasBack() && (
        <>
          <Button
            sm
            flat
            iconClass="text-xl"
            icon={baseConfig().iconArrowLeft()}
            onClick={() => closeModal(id)}
            {...props.backButtonProps}
          />
          <div class="mx-1 h-6 border-l border-neutral-50"></div>
        </>
      )}
      {props.title && <div class={titleClass()}>{props.title}</div>}
      {props.children}
      {hasClose() && (
        <Button
          sm
          flat
          iconClass="text-xl"
          icon={baseConfig().iconClose()}
          onClick={() => closeModal(id)}
          {...props.closeButtonProps}
        />
      )}
    </div>
  );
}
Dialog.Header = DialogHeader;

export interface DialogBodyProps extends BaseProps {}
export function DialogBody(props: DialogBodyProps) {
  const id = generateId();
  const { scrollable } = useModal();
  const bodyClass = () =>
    mergeClass(
      'p-4',
      'first:rounded-t-inherit last:rounded-b-inherit',
      scrollable ? '' : 'flex-1 min-h-0 overflow-y-auto',
      props.class,
    );

  return (
    <div class={bodyClass()} style={props.style} id={id}>
      {props.children}
    </div>
  );
}
Dialog.Body = DialogBody;

export interface DialogFooterProps extends ButtonGroupProps {
  buttonGroupClass?: string;
}
export function DialogFooter(props: DialogFooterProps) {
  const { id, mode, scrollable } = useModal();
  const dialogs = getModals();
  const hasBack = mode == 'main' && dialogs.length > 1;

  const footerClass = () =>
    mergeClass(
      'p-2 bg-inherit rounded-b-inherit',
      scrollable ? 'sticky flex-0 bottom-0' : 'flex-shrink-0',
      props.class,
    );

  return (
    <div class={footerClass()}>
      <ButtonGroup
        reverse
        cancelLabel={
          props.cancelLabel === undefined
            ? hasBack
              ? baseConfig().dialogBackLabel
              : baseConfig().dialogCloseLabel
            : props.cancelLabel
        }
        onCancel={() => {
          closeModal(id);
        }}
        type="main"
        displayStyle="dialog"
        isStrong
        {...props}
        class={props.buttonGroupClass}
      />
    </div>
  );
}
Dialog.Footer = DialogFooter;
