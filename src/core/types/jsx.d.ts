import type { JSX } from 'solid-js';
export = JSX;
export as namespace JSX;

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': any;
    }
  }
}
