import { createContext, useContext } from 'solid-js';

export const DropdownContext = createContext<{
  closeDropdown: () => any;
}>({ closeDropdown: () => {} });

export function useDropdown() {
  return useContext(DropdownContext);
}
