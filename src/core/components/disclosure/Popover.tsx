import { mergeClass } from '@core/helpers/class';
import { createSignal } from 'solid-js';
import { Floating, type FloatingProps, getOrigin } from '../floating/Floating';
import { PopoverContext } from './PopoverContext';

export interface PopoverProps extends FloatingProps { }
export function Popover(props: PopoverProps) {
  const [open, setOpen] = createSignal(false);

  const closePopover = () => {
    setOpen(false);
  };
  const popoverClass = () =>
    mergeClass(
      'rounded-md border border-neutral-200 bg-white p-2 shadow-sm',
      props.class,
    );

  return (
    <PopoverContext.Provider value={{ closePopover }}>
      <Floating
        open={open()}
        onOpen={setOpen}
        trigger="click"
        arrow
        arrowClass="border-neutral-200"
        placement="bottom-start"
        animationDuration={200}
        inactiveClass={({ placement }) => {
          return `transition ease-in-out translate-x-0 translate-y-0 scale-75 opacity-0 ${getOrigin(
            placement,
          )}`;
        }}
        activeClass={({ side: _side }) => {
          return `opacity-100 scale-100 translate-x-0 translate-y-0`;
        }}
        {...props}
        class={popoverClass()}
      />
    </PopoverContext.Provider>
  );
}
