// src/shared/components/editor/TableGridPicker.tsx
import { createSignal, For } from 'solid-js';

export function TableGridPicker(props: { onSelect: (rows: number, cols: number) => void; max?: number }) {
  const max = () => props.max ?? 10;
  const [hover, setHover] = createSignal({ rows: 1, cols: 1 });
  const cells = () =>
    Array.from({ length: max() }, (_, r) => Array.from({ length: max() }, (_, c) => ({ r: r + 1, c: c + 1 }))).flat();

  return (
    <div class="rounded border border-neutral-200 bg-white p-2 shadow-lg">
      <div class="grid gap-0.5" style={{ 'grid-template-columns': `repeat(${max()}, 16px)` }}>
        <For each={cells()}>
          {(cell) => (
            <div
              class={`h-4 w-4 border ${cell.r <= hover().rows && cell.c <= hover().cols ? 'border-main-600 bg-main-100' : 'border-neutral-200'}`}
              onMouseEnter={() => setHover({ rows: cell.r, cols: cell.c })}
              onClick={() => props.onSelect(cell.r, cell.c)}
            />
          )}
        </For>
      </div>
      <div class="mt-1 text-center text-xs text-neutral-500">{hover().rows} x {hover().cols}</div>
    </div>
  );
}
