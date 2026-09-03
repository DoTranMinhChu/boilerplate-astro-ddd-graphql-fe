import { cloneDeep, FastCloningStrategy } from 'radashi';
import { unwrap } from 'solid-js/store';

/** Detaches a value read from `data` (generateForm's Solid Store) into an independent copy, to
 * seed a control's LOCAL signal (createControl.tsx). Needed because in EDIT mode `value()`
 * returns a live Store proxy for array/object fields — seeding that directly means in-place
 * list-editor mutations write to the proxy itself, whose `set` trap silently drops the write
 * (production build just `return true`s, no warning) — completely silent data loss.
 *
 * 3 things that must not be simplified away, verified experimentally against Solid 1.9's real
 * browser build: (1) must guard primitives BEFORE cloning — radashi's cloneDeep infinite-recurses
 * on undefined/null/false/0/''/NaN. (2) must use FastCloningStrategy — default cloneDeep copies
 * property DESCRIPTORS, and Solid Store proxies expose getter-only descriptors, so a plain clone
 * still throws "has only a getter" on write. (3) must NOT substitute cloneDeep(unwrap(v)) — unwrap
 * leaves Solid's $PROXY/$NODE symbols on the object, which get copied too; writing that "clone"
 * back into the store just resolves to the same old Proxy. (Caveat: FastCloningStrategy flattens
 * class instances — none currently flow into form values.) */
export function detachFromStore<T>(val: T): T {
  if (!val || typeof val !== 'object') return val;
  if (unwrap(val as any) === (val as any)) return val;
  return cloneDeep(val as any, FastCloningStrategy) as T;
}
