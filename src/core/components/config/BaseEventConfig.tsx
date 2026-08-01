import { createSignal } from 'solid-js';

const [tokenExpired, setTokenExpired] = createSignal(false);
const [outOfScope, setOutOfScope] = createSignal(false);

export const baseEventConfig = {
  tokenExpired,
  setTokenExpired,
  outOfScope,
  setOutOfScope,
};
