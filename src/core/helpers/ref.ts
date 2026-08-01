import { Ref, mergeRefs } from '@solid-primitives/refs';

export function mergeRef<T>(...refs: (Ref<T> | ((el: T) => void))[]) {
  return mergeRefs(...refs);
}
