import { createContext, useContext } from 'solid-js';

export const PopoverContext = createContext<{
  closePopover: () => any;
}>({ closePopover: () => {} });

export function usePopover() {
  return useContext(PopoverContext);
}
