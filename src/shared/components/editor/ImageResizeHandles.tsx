// src/shared/components/editor/ImageResizeHandles.tsx
import { createEffect, onCleanup, Show } from 'solid-js';
import { createSignal } from 'solid-js';
import type { EditorCore } from './core/EditorCore';

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export function ImageResizeHandles(props: { core: () => EditorCore | undefined; container: () => HTMLElement | undefined }) {
  const [target, setTarget] = createSignal<HTMLElement>();
  const [rect, setRect] = createSignal<{ top: number; left: number; width: number; height: number }>();

  const updateTarget = () => {
    const core = props.core();
    if (!core) { setTarget(undefined); return; }
    const sel = window.getSelection();
    let el: Node | null | undefined = sel?.anchorNode;
    el = el?.nodeType === Node.TEXT_NODE ? el.parentElement : (el as HTMLElement | null);
    while (el && el !== core.root) {
      if (
        (el as HTMLElement).tagName === 'FIGURE'
        && ((el as HTMLElement).classList.contains('ed-image') || (el as HTMLElement).classList.contains('image'))
      ) {
        setTarget(el as HTMLElement);
        return;
      }
      el = (el as HTMLElement).parentElement;
    }
    setTarget(undefined);
  };

  const updateRect = () => {
    const el = target();
    const container = props.container();
    if (!el || !container) { setRect(undefined); return; }
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setRect({
      top: elRect.top - containerRect.top + container.scrollTop,
      left: elRect.left - containerRect.left + container.scrollLeft,
      width: elRect.width,
      height: elRect.height,
    });
  };

  createEffect(() => {
    const core = props.core();
    if (!core) return;
    const off = core.on('selectionchange', () => {
      updateTarget();
      updateRect();
    });
    onCleanup(off);
  });

  let dragging: { startX: number; startWidth: number; ratio: number; sign: number } | null = null;

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const img = target()?.querySelector('img') as HTMLImageElement | undefined;
    if (!img) return;
    const dx = e.clientX - dragging.startX;
    const newWidth = Math.max(40, dragging.startWidth + dx * dragging.sign);
    img.style.width = `${newWidth}px`;
    img.style.height = `${newWidth / dragging.ratio}px`;
    updateRect();
  };

  const onPointerUp = () => {
    dragging = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    props.core()?.commitHistory();
  };

  const onPointerDown = (corner: (typeof CORNERS)[number]) => (e: PointerEvent) => {
    e.preventDefault();
    const img = target()?.querySelector('img') as HTMLImageElement | undefined;
    if (!img) return;
    dragging = {
      startX: e.clientX,
      startWidth: img.getBoundingClientRect().width,
      ratio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1,
      sign: corner.includes('right') ? 1 : -1,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  onCleanup(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  });

  return (
    <Show when={rect()}>
      {(r) => (
        <>
          {CORNERS.map((corner) => (
            <div
              onPointerDown={onPointerDown(corner)}
              class="absolute z-10 h-2.5 w-2.5 rounded-full border border-white bg-main-600"
              style={{
                top: `${r().top + (corner.includes('bottom') ? r().height : 0) - 5}px`,
                left: `${r().left + (corner.includes('right') ? r().width : 0) - 5}px`,
                cursor: corner === 'top-left' || corner === 'bottom-right' ? 'nwse-resize' : 'nesw-resize',
              }}
            />
          ))}
        </>
      )}
    </Show>
  );
}
