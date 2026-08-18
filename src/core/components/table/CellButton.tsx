import { Button, ButtonProps } from '@core/components/button/Button';
import { mergeClass } from '@core/helpers/class';

export interface CellButtonProps extends ButtonProps {
  /** Admin UI Polish, Task 1 — when false, renders the SAME-SIZE button element made
   * invisible and non-interactive (click-handler/href/focus suppressed), instead of not
   * rendering at all. The icon/content is deliberately NOT suppressed — it must stay so the
   * button keeps its normal size and reserves its column, keeping a table's action buttons
   * vertically aligned row to row even when a given row's action set differs (e.g. "Publish"
   * only applies to unpublished rows) — matching the exact "để trống thay vì co giãn" behavior
   * requested. Defaults to true (rendered normally, unchanged for every existing call site). */
  visible?: boolean;
}
export function CellButton(props: CellButtonProps) {
  const isVisible = () => props.visible ?? true;
  // href falls back to '' (not undefined) when hidden: Solid's mergeProps skips an `undefined`
  // override and falls through to the spread's original href, which would defeat the
  // suppression — '' is falsy for Button.tsx's kind() check and isn't skipped by mergeProps.
  return (
    <Button
      light={
        !props.type &&
        !props.solid &&
        !props.outline &&
        !props.flat &&
        !props.ghost
      }
      sm
      {...props}
      href={isVisible() ? props.href : ''}
      onClick={isVisible() ? props.onClick : null}
      focusable={isVisible() ? props.focusable : false}
      class={mergeClass(props.class, !isVisible() && 'invisible pointer-events-none')}
    />
  );
}
