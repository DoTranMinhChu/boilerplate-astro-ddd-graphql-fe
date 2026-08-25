import { baseConfig } from '@core/components/config/BaseConfig';
import { closeModal, getModals } from '@core/components/modal/ModalProvider';
import { mergeClass } from '@core/helpers/class';
import { mergeProps } from 'solid-js';
import { Dialog, DialogFooterProps, DialogProps } from './Dialog';

export type ConfirmType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'caution'
  | 'question'
  | 'danger';
export type ConfirmColor = Extract<
  SemanticColor,
  'main' | 'sub' | 'accent' | 'special' | 'brand'
>;

export interface ConfirmProps
  extends Omit<DialogProps, 'id'>, DialogFooterProps {
  type: ConfirmType;
  color?: ConfirmColor;
  title?: string | (() => JSX.Element);
  content?: string | (() => JSX.Element);
  titleClass?: string;
  contentClass?: string;
  icon?: () => JSX.Element;
  iconClass?: string;
  bodyClass?: string;
  footerClass?: string;
}
export function ConfirmDialog(props: ConfirmProps) {
  const id = 'ConfirmDialog';
  const icon = () => {
    if (props.icon) return props.icon();

    switch (props.type) {
      case 'info': {
        return baseConfig().iconInfo();
      }
      case 'success': {
        return baseConfig().iconSuccess();
      }
      case 'error': {
        return baseConfig().iconError();
      }
      case 'warning':
      case 'caution': {
        return baseConfig().iconWarning();
      }
      case 'danger': {
        return baseConfig().iconDanger();
      }
      case 'question': {
        return baseConfig().iconQuestion();
      }
    }
  };

  const color: () => SemanticColor = () => {
    if (props.color) {
      return props.color;
    }
    switch (props.type) {
      case 'error': {
        return 'danger';
      }
      case 'caution': {
        return 'warning';
      }
      case 'question': {
        return 'main';
      }
      default:
        return props.type;
    }
  };

  const confirmClass = () =>
    mergeClass(getModals().length ? 'w-sm' : 'w-md', props.class);
  const titleClass = () =>
    mergeClass(
      'text-center font-semibold text-xl text-neutral-700 mb-3 first-letter:uppercase',
      props.titleClass,
    );
  const contentClass = () =>
    mergeClass(
      'text-center font-normal text-base text-neutral-600 first-letter:uppercase',
      props.contentClass,
    );

  const iconClass = () => {
    let iconClass = 'mb-1 text-5xl ';
    if (props.color) {
      switch (props.color) {
        case 'sub': {
          iconClass += 'text-sub';
          break;
        }
        case 'accent': {
          iconClass += 'text-accent';
          break;
        }
        case 'brand': {
          iconClass += 'text-brand';
          break;
        }
        case 'special': {
          iconClass += 'text-special';
          break;
        }
        case 'main':
        default: {
          iconClass += 'text-main';
          break;
        }
      }
    } else {
      switch (props.type) {
        case 'info': {
          iconClass += 'text-info';
          break;
        }
        case 'success': {
          iconClass += 'text-success';
          break;
        }
        case 'warning':
        case 'caution': {
          iconClass += 'text-warning';
          break;
        }
        case 'danger':
        case 'error': {
          iconClass += 'text-danger';
          break;
        }
        case 'question': {
          iconClass += 'text-main';
          break;
        }
      }
    }
    return mergeClass(iconClass, props.iconClass);
  };

  const isStrong = () =>
    props.type == 'caution' ||
    props.type == 'danger' ||
    props.type == 'question';

  const bodyClass = () =>
    mergeClass(`min-h-48 p-6 flex-col-center`, props.bodyClass);
  const footerClass = () => mergeClass('', props.footerClass);

  const footerProps = () =>
    mergeProps(props, {
      class: footerClass(),
      isStrong: isStrong(),
      type: color(),
      // An explicit `submitLabel` always wins (this `||` short-circuits before anything
      // below it), so every call site that already passes one is unaffected.
      //
      // Final-review fix: the fallback for a "strong" (caution/danger/question) dialog used
      // to be `props.title` — i.e. a dialog that didn't name its own action reused its TITLE
      // as the submit button's label. Titles here are frequently full sentences
      // ("Delete this element (and all of its children)? You can undo with Ctrl+Z."), which
      // then rendered verbatim inside the button. That was patched once at a single call
      // site; it was in fact live at every strong call site that omits `submitLabel`. Fixed
      // at the shared default instead, so strong and non-strong dialogs both fall back to
      // the generic confirm-action label. `props.title` may also be a `() => JSX.Element`,
      // which a button label should never have been fed in the first place.
      submitLabel: props.submitLabel || baseConfig().confirmSubmitLabel,
      cancelLabel:
        props.cancelLabel ||
        (isStrong() ? baseConfig().confirmCancelLabel : ''),
      onSubmit: async (e) => {
        await props.onSubmit?.(e);
        closeModal(id);
      },
      onCancel: async (e) => {
        await props.onCancel?.(e);
        closeModal(id);
      },
    } as DialogFooterProps);

  return (
    <Dialog id={id} {...props} class={confirmClass()}>
      <div class={bodyClass()}>
        <div class={iconClass()}>{icon()}</div>
        <div class={titleClass()}>
          {typeof props.title == 'string' ? props.title : props.title?.()}
        </div>
        <div class={contentClass()}>
          {typeof props.content == 'string' ? props.content : props.content?.()}
        </div>
      </div>
      <Dialog.Footer {...footerProps()} />
    </Dialog>
  );
}
