import { Input, InputProps } from '@core/components/control/Input';
import { mergeClass } from '@core/helpers/class';
import {
  parseColorStringToHex,
  parseRGBStringToRGB,
  parseRGBToHex,
} from '@core/helpers/color';
import { mergeRef } from '@core/helpers/ref';
import { HexColorPicker } from 'solid-colorful';
import { For, Ref, splitProps } from 'solid-js';
import { Popover } from '../disclosure/Popover';

export interface InputColorProps extends InputProps {
  /** List of class */
  swatches?: string[];
  showPicker?: boolean;
}
export function InputColor(props: InputColorProps) {
  const [_colorProps, inputProps] = splitProps(props, [
    'swatches',
    'showPicker',
  ]);
  let inputRef: Ref<HTMLInputElement>;
  let colorRef: Ref<HTMLDivElement>;
  const swatches = () =>
    props.swatches || [
      'bg-main',
      'bg-sub',
      'bg-accent',
      'bg-light',
      'bg-neutral',
      'bg-dark',
      'bg-red',
      'bg-orange',
      'bg-yellow',
      'bg-lime',
      'bg-green',
      'bg-teal',
      'bg-cyan',
      'bg-blue',
      'bg-indigo',
      'bg-purple',
      'bg-pink',
      'bg-rose',
    ];
  const showPicker = () => props.showPicker ?? true;

  const hex = () => {
    let hex = props.value;
    if (typeof hex == 'string' && !hex.startsWith('#')) {
      hex = parseColorStringToHex(hex);
    }
    return hex;
  };

  return (
    <>
      <Input
        {...inputProps}
        inputRef={mergeRef(props.inputRef, (el) => (inputRef = el))}
        // onWrapperFocus={() => {
        //   (ref.current as any)?._tippy.show();
        // }}
        // onWrapperBlur={() => {
        //   (ref.current as any)?._tippy.hide();
        // }}
        prefix={
          <div
            ref={colorRef!}
            class="h-7 w-7 cursor-pointer rounded-sm transition hover:shadow-md"
            style={{
              'background-color': (hex() || '#000') as string,
            }}
            tabIndex={-1}
            onClick={(_val) => {
              (inputRef as HTMLInputElement).focus();
            }}
          ></div>
        }
        prefixClass="bg-transparent pl-1.5 pr-0 border-0"
      >
        <Popover
          reference={colorRef! as Ref<HTMLElement>}
          placement="bottom-start"
        >
          <div class="flex flex-col gap-2">
            {showPicker() && (
              <HexColorPicker
                tabIndex={-1}
                color={hex() || '#000' as any}
                onChange={(val: string) => {
                  props.onChange?.(val);
                }}
              />
            )}
            <div class="grid grid-cols-6 gap-2">
              <For each={swatches()}>
                {(swatch) => (
                  <Swatch
                    class={swatch}
                    onClick={(val) => {
                      props.onChange?.(val);
                    }}
                  />
                )}
              </For>
            </div>
          </div>
        </Popover>
      </Input>
    </>
  );
}

function Swatch(props: { class: string; onClick: (color: string) => any }) {
  return (
    <div
      class={mergeClass(
        `h-6 w-6 cursor-pointer rounded-sm transition hover:scale-110 ${props.class}`,
      )}
      onClick={(e) => {
        const style = getComputedStyle(e.target);
        const rgb = parseRGBStringToRGB(
          style.getPropertyValue('background-color'),
        );
        props.onClick(parseRGBToHex(rgb.r, rgb.g, rgb.b));
      }}
    ></div>
  );
}
