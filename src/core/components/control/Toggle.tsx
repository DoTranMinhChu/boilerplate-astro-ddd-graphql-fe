import { mergeClass } from '@core/helpers/class';
import { createSignal } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { createControl } from './createControl';

export interface ToggleProps
  extends Omit<FormControlProps<boolean>, 'placeholder'> {
  text?: string | JSX.Element;
  textClass?: string;
  subText?: string | JSX.Element;
  subTextClass?: string;
  wrapperClass?: string;
  sliderClass?: string;
  loaderClass?: string;
  iconLoading?: JSX.Element;
  color?: 'main' | 'sub' | 'accent' | 'neutral';
  /**Pass in an (async) function that will toggle the state temporarily and trigger the switch loading state.
   * If success, the switch will emit an onChange event.
   * If failed, the switch remains the same, turn off its temporary toggled state.
   */
  onToggle?: (val: boolean) => any | Promise<any>;
  sm?: boolean;
}
export function Toggle(props: ToggleProps) {
  const [loading, setLoading] = createSignal(false);
  const { value, onChange, readOnly, error: _error } = createControl<boolean>(
    'boolean',
    props,
  );

  const color = () => props.color || 'main';
  const toggle = async () => {
    if (props.readOnly) return;

    if (props.onToggle) {
      try {
        setLoading(true);
        await props.onToggle(!value());
        onChange(!value());
      } catch (err) {
      } finally {
        setLoading(false);
      }
    } else {
      onChange(!value());
    }
  };

  const activeBackgroundClass = () => {
    switch (color()) {
      case 'main': {
        return readOnly()
          ? 'bg-main-300 shadow-none'
          : 'bg-main group-hover:bg-main-600';
      }
      case 'sub': {
        return readOnly()
          ? 'bg-sub-300 shadow-none'
          : 'bg-sub group-hover:bg-sub-600';
      }
      case 'accent': {
        return readOnly()
          ? 'bg-accent-300 shadow-none'
          : 'bg-accent group-hover:bg-accent-600';
      }
      case 'neutral': {
        return readOnly()
          ? 'bg-neutral-300 shadow-none'
          : 'bg-neutral group-hover:bg-neutral-600';
      }
    }
  };
  const loadingBackgroundClass = () => {
    switch (color()) {
      case 'main': {
        return 'bg-main-300';
      }
      case 'sub': {
        return 'bg-sub-300';
      }
      case 'accent': {
        return 'bg-accent-300';
      }
    }
  };
  const switchClass = () =>
    mergeClass(
      'min-h-10 inline-flex self-start gap-2 cursor-pointer group hover:text-neutral-900',
      (loading() || readOnly()) && 'pointer-events-none text-neutral-300',
      props.subText ? 'items-start' : 'items-center',
      props.class,
    );
  const wrapperClass = () =>
    mergeClass(
      `relative inline-block grow-0 shrink-0 ${props.sm ? 'w-9 h-5' : 'w-12 h-7'
      }`,
      props.subText ? 'mt-1' : '',
      props.wrapperClass,
    );
  const inputClass = () => 'opacity-0 w-0 h-0 peer';
  const sliderClass = () =>
    mergeClass(
      `absolute cursor-pointer flex-center top-0 left-0 right-0 bottom-0 rounded-full
  before:absolute before:shadow-2xs before:bg-white before:rounded-full before:transition before:ease-in-out`,
      value()
        ? activeBackgroundClass()
        : readOnly()
          ? 'bg-neutral-100 shadow-none'
          : 'bg-neutral-200 group-hover:bg-neutral-300',
      props.sm
        ? 'before:w-3.5 before:h-3.5 before:left-1 before:bottom-(0.1875rem) '
        : 'before:w-5 before:h-5 before:left-1 before:bottom-1 ',
      loading()
        ? `${loadingBackgroundClass()} ${props.sm ? 'before:translate-x-2' : 'before:translate-x-2.5'
        }`
        : props.sm
          ? 'peer-checked:before:translate-x-3.5'
          : 'peer-checked:before:translate-x-5',
      props.sliderClass,
    );
  const loaderClass = () =>
    mergeClass(
      'absolute flex-center transition self-center',
      loading() ? 'opacity-100' : 'opacity-0',
      props.sm
        ? 'text-xsm left-1 ' +
        (loading() ? 'translate-x-2' : value() ? 'translate-x-3.5' : '')
        : 'text-base left-1.5 ' +
        (loading() ? 'translate-x-2.5' : value() ? 'translate-x-5' : ''),
    );

  const textClass = () =>
    mergeClass(
      'leading-tight',
      props.subText && 'font-medium',
      props.sm ? 'text-sm' : 'text-base',
      props.textClass,
    );
  const subTextClass = () =>
    mergeClass('text-xs font-normal leading-tight', props.subTextClass);

  const iconLoading = () => props.iconLoading || baseConfig().iconSpinner();

  return (
    <div
      tabIndex={props.skipTabIndex || readOnly() ? -1 : 0}
      class={switchClass()}
      onClick={(e) => {
        // Bug A fix (Task 14 live-verify follow-up): khi Toggle này nằm lồng trong 1 <label>
        // (vd manageContentTypes.page.tsx's `<label><Datatable.Field><Toggle/></Datatable.Field>{text}</label>`),
        // trình duyệt tự động forward click của label tới input native ẩn bên trong (hidden
        // checkbox bên dưới), rồi bubble ngược lên div này, bắn `onClick={toggle}` LẦN NỮA —
        // 2 lần toggle() đồng bộ huỷ lẫn nhau (click chuột không làm gì cả). `preventDefault()`
        // trên click event là hậu duệ của <label> sẽ chặn hành vi mặc định của label (chính là
        // forward click tới control labelable) — chặn TẠI NGUỒN, không cần biết click đến từ
        // label hay không.
        e.preventDefault();
        toggle();
      }}
      onKeyDown={(e) => {
        if (readOnly()) return;
        if (e.key == 'Enter') toggle();
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      <span class={wrapperClass()}>
        <input
          hidden
          class={inputClass()}
          type="checkbox"
          value={value() ? 'checked' : undefined}
          checked={value() ? true : false}
          name={props.name}
          readOnly={props.readOnly}
          onChange={() => { }}
        />
        <span class={sliderClass()}>
          <i class={loaderClass()}>{iconLoading()}</i>
        </span>
      </span>
      {props.text && (
        <span class={textClass()}>
          {props.text}
          {props.subText && <div class={subTextClass()}>{props.subText}</div>}
        </span>
      )}
    </div>
  );
}
