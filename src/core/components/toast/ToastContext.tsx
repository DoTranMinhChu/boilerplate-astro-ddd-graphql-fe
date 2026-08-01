import { createContext, useContext } from "solid-js";

export const ToastContext = createContext();
export function useToast() {
  return useContext(ToastContext);
}
