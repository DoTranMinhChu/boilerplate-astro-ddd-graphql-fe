import { Button, ButtonProps } from '@core/components/button/Button';
import { mergeClass } from '@core/helpers/class';
import { createSignal } from 'solid-js';
import { Floating, FloatingProps, getOrigin } from '../floating/Floating';
import { DropdownContext, useDropdown } from './DropdownContext';

export interface DropdownProps extends FloatingProps {}
export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false);

  const closeDropdown = () => {
    setOpen(false);
  };
  const dropdownClass = () =>
    mergeClass(
      'min-w-40 flex flex-col gap-0.5 rounded-lg border border-neutral-100 bg-white px-1.5 py-1.5 shadow-sm',
      props.class,
    );

  return (
    <DropdownContext.Provider value={{ closeDropdown }}>
      <Floating
        open={open()}
        onOpen={setOpen}
        offset={4}
        trigger="click"
        placement="bottom-start"
        fallbackPlacements={['bottom-end', 'top-end', 'top-start']}
        animationDuration={150}
        inactiveClass={({ placement, side }) => {
          return `transition duration-150 ease-in-out translate-y-0 opacity-0 ${getOrigin(
            placement,
          )} ${side == 'top' ? 'translate-y-2' : '-translate-y-2'}`;
        }}
        activeClass={() => {
          return `opacity-100 translate-y-0`;
        }}
        {...props}
        class={dropdownClass()}
      />
    </DropdownContext.Provider>
  );
}

export interface DropdownButtonProps extends ButtonProps {
  closeDropdownAfterTask?: boolean;
}
export function DropdownButton(props: DropdownButtonProps) {
  const closeDropdownAfterTask = props.closeDropdownAfterTask ?? true;
  const { closeDropdown } = useDropdown();
  const interact = props.interact || (props.interactDanger ? 'danger' : 'main');
  const onClick = async (e: MouseEvent) => {
    try {
      await props.onClick?.(e);
    } finally {
      if (closeDropdownAfterTask) {
        closeDropdown();
      }
    }
  };
  return <Button flat interact={interact} left {...props} onClick={onClick} />;
}
Dropdown.Button = DropdownButton;

export interface DropdownDividerProps extends BaseProps {}
export function DropdownDivider(props: DropdownDividerProps) {
  const dropdownDividerClass = () =>
    mergeClass(
      'border-t my-1 border-neutral-200 border-dashed w-full',
      props.class,
    );

  return (
    <div class="px-2">
      <div {...props} class={dropdownDividerClass()} />
    </div>
  );
}
Dropdown.Divider = DropdownDivider;
