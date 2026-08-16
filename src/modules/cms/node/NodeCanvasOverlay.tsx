// src/modules/cms/node/NodeCanvasOverlay.tsx
//
// Task 4: moved here from `admin/nodeBuilder/` (its original Task 3 location) — this
// is conceptually node-RENDERING infrastructure (gated entirely by `builderSelection`,
// which is `undefined` on the public site — see node.types.ts's comment on that field),
// not admin-page-specific UI. Keeping it under `admin/nodeBuilder/` would have forced
// NodeRenderer.tsx (imported by BOTH the public CmsPageShell.astro pipeline and the
// admin builder) to statically import from the admin-only tree to mount it (Task 4's
// Step 3), which is exactly the kind of public-bundle-boundary violation the M1c plan
// flagged as needing a judgment call — resolved by moving the component instead of
// having NodeRenderer.tsx reach into `admin/`.
import { Show, For, createSignal, onMount } from 'solid-js';
import { t } from '@/shared/i18n/t';
import type { LayoutProps, ResizeHandle } from './node.types';

export interface NodeCanvasOverlayProps {
    layout: LayoutProps;
    isMultiSelect: boolean;
    isDraggableParent: boolean;
    onResizeHandlePointerDown?: (handle: ResizeHandle, e: PointerEvent) => void;
    onRotateHandlePointerDown?: (e: PointerEvent) => void;
    /** M1c final-review fix I4 — a THUNK (not a precomputed value) returning the real
     * rendered size of the node this overlay shadows (`getElementSize`, node.types.ts),
     * used ONLY as a fallback when `layout.width`/`height` is unset. Without any fallback,
     * every freshly-created node (no `layout` at all yet) rendered a 0×0 selection box:
     * this component used to default straight to `0`, while the REAL node
     * (`applyChildLayout`) omits width/height from its CSS entirely in that case and sizes
     * to content instead — so `0` was never an accurate stand-in for "unset", just the
     * wrong assumption that unset meant zero.
     *
     * Deliberately a FUNCTION, called from `onMount` below rather than read eagerly as a
     * plain prop value at JSX-construction time: `elementRegistry`'s entry for this exact
     * node is written by a SIBLING component's (`NodeRenderer`'s) own `ref` callback in the
     * same `<For>` item — reading it (and, more importantly, that element's real
     * `offsetWidth`/`offsetHeight`, which require the element to already be CONNECTED to
     * the live document and laid out) at prop-evaluation time races the sibling's own
     * mount/connection order. `onMount` is guaranteed to run only once the WHOLE initial
     * subtree — sibling elements included — is connected, so this is timing-safe regardless
     * of which of the 2 sibling components Solid happens to construct first. */
    getFallbackSize?: () => { width: number; height: number } | undefined;
}

const HANDLE_POSITIONS: { handle: ResizeHandle; class: string }[] = [
    { handle: 'nw', class: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { handle: 'n', class: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
    { handle: 'ne', class: 'left-full top-0 -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { handle: 'e', class: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
    { handle: 'se', class: 'left-full top-full -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { handle: 's', class: 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
    { handle: 'sw', class: 'left-0 top-full -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { handle: 'w', class: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
];

/** Vẽ như 1 SIBLING của node nó đang "shadow", nằm trong CÙNG 1 free-layout parent —
 * tái dùng đúng x/y/width/height/rotation CSS của chính node đó (giống hệt cách
 * applyChildLayout.ts:26-47 tính, xem Step 1 của task-3-brief.md) nên vị trí/kích
 * thước/góc xoay của khung chọn luôn khớp pixel-perfect với node thật một cách tự
 * động (nhờ chính browser layout engine), không cần tính toán toạ độ screen-space thủ
 * công nào cả, kể cả khi node nằm dưới 1 ancestor đang bị xoay. Mount ở NodeRenderer.tsx's
 * `NodeChildrenList` (Task 4, dưới dạng 1 sibling ngay sau `<NodeRenderer>` của child đang
 * chọn) — pointerdown của handle vẫn CHƯA nối vào drag logic thật (Task 5/6).
 *
 * Quyết định z-index (brief Step 1 để ngỏ, phải tự chọn): dùng 1 HẰNG SỐ cố định rất
 * cao (`OVERLAY_Z_INDEX`) thay vì "zIndex của node + offset". Lý do: offset tương đối
 * vẫn có thể bị 1 sibling khác có zIndex cực lớn (user tự nhập ở NodeTransformTab) vượt
 * qua, còn hằng số cố định đủ lớn đảm bảo overlay/handle LUÔN nổi trên mọi node ở mọi
 * layer — handle phải luôn bấm được bất kể node đang chọn nằm ở tầng nào trong stack.
 * Đơn giản hơn (không cần đọc/parse `layout.zIndex` của node) và không có nhược điểm
 * thực tế nào (overlay là UI tạm thời của canvas, không phải nội dung, không có 2 overlay
 * nào cùng hiển thị 1 lúc để so bì thứ tự với nhau — CHỈ node đang được chọn mới có overlay). */
const OVERLAY_Z_INDEX = 99999;

/** Residual-bug fix (post-I4) — a freshly-created, still-EMPTY node (no `layout.width`/
 * `height` set AND no real content yet — e.g. a brand-new Shape/Text node right after
 * being added via the palette, before any styling/typing happens) genuinely measures
 * 0×0 via `offsetWidth`/`offsetHeight`: an empty `<div>` with no CSS-driven natural size
 * really does collapse to zero, so I4's own `getFallbackSize()` fallback (correct for
 * nodes with real natural content size, e.g. an image or typed text) bottoms out at `0`
 * too in exactly this case, leaving the selection box collapsed to a point again.
 *
 * `MIN_FALLBACK_SIZE` is a floor applied ONLY when the fallback measurement itself is
 * absent/zero (`||`, not `Math.max` — deliberately: `Math.max` would also bump up any
 * node whose real measured size is small-but-non-zero and below 40, e.g. an 8px icon,
 * which would misrepresent it) — never against an explicit `layout.width`/`height` the
 * user actually set, and never against a real measured size that's already > 0 (however
 * small). So a fresh empty node is always visibly grabbable, while a node with SOME real
 * rendered size (even a tiny one) still shows its true size untouched. 40px is big enough
 * that the 8 resize handles (each a ~10px dot positioned at a corner/edge midpoint) don't
 * overlap each other, small enough not to visually dominate a still-empty node. */
export const MIN_FALLBACK_SIZE = 40;

/** Khung chọn (selection outline) + 8 handle resize + 1 handle rotate cho node đang
 * được chọn trên canvas Node Builder. Mounted bởi NodeRenderer.tsx (Task 4); handle
 * pointerdown vẫn chưa nối vào drag logic thật — Task 5/6 wire
 * `onResizeHandlePointerDown`/`onRotateHandlePointerDown` (nodeDragState, moveNode/
 * resizeNode commands...). */
export function NodeCanvasOverlay(props: NodeCanvasOverlayProps) {
    // M1c final-review fix I4 — measured once, post-mount (see `getFallbackSize`'s doc
    // comment above on why this can't just be read inline during `style()`'s own
    // computation): only ever needed as a fallback for a node with no explicit
    // `layout.width`/`height` at all, which — being layout-space, server-persisted data —
    // doesn't change out from under this component without a full remount (a fresh
    // `layout` object triggers `buildNodeTree`'s unstable identity, per NodeBuilder.page.tsx's
    // own header comment on that), so a single post-mount measurement is sufficient; no
    // ResizeObserver/live-tracking needed.
    const [fallbackSize, setFallbackSize] = createSignal<{ width: number; height: number } | undefined>(undefined);
    onMount(() => setFallbackSize(props.getFallbackSize?.()));

    const style = () => ({
        position: 'absolute' as const,
        left: `${props.layout.x ?? 0}px`,
        top: `${props.layout.y ?? 0}px`,
        width: `${props.layout.width ?? (fallbackSize()?.width || MIN_FALLBACK_SIZE)}px`,
        height: `${props.layout.height ?? (fallbackSize()?.height || MIN_FALLBACK_SIZE)}px`,
        transform: props.layout.rotation ? `rotate(${props.layout.rotation}deg)` : undefined,
        'z-index': OVERLAY_Z_INDEX,
    });

    return (
        // pointer-events-none trên root: bản thân "thân" overlay KHÔNG được chặn click/drag
        // nhắm vào node thật (hoặc canvas) nằm bên dưới nó — chỉ 2 loại element con bên
        // trong (dot resize + dot rotate) tự bật lại pointer-events-auto để chính chúng
        // bấm được, còn viền ring chọn (thuần trang trí) giữ nguyên pointer-events-none.
        <div style={style()} class="pointer-events-none">
            <div class="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-sky-500" />
            <Show when={!props.isMultiSelect && props.isDraggableParent}>
                <For each={HANDLE_POSITIONS}>
                    {(h) => (
                        <div
                            class={`pointer-events-auto absolute h-2.5 w-2.5 rounded-full border border-sky-500 bg-white shadow ${h.class}`}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                props.onResizeHandlePointerDown?.(h.handle, e);
                            }}
                        />
                    )}
                </For>
                <div class="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 -translate-y-full bg-sky-500" />
                <div
                    class="pointer-events-auto absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-[calc(100%+24px)] cursor-grab rounded-full border border-sky-500 bg-white shadow"
                    title={t('cms.node.canvasOverlay.rotateHandleLabel')}
                    aria-label={t('cms.node.canvasOverlay.rotateHandleLabel')}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        props.onRotateHandlePointerDown?.(e);
                    }}
                />
            </Show>
        </div>
    );
}
