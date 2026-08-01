import { Accessor, createContext, useContext } from 'solid-js';
import { ModalProps } from './Modal';

export const ModalContext = createContext<
  Partial<
    ModalProps & {
      isClosing: Accessor<boolean>;
    }
  >
>({});
export const useModal = () => useContext(ModalContext);
