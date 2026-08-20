// src/modules/cms/node/node.types.ts
// Mirrors the Section*/PageStyle pattern in @/modules/cms/cms.types.ts, but for the
// generic recursive Node tree. See docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §§2-6.
//
// NodeDTO ở cuối file này override lại field JSONB (GraphQLMixed bị codegen phát sinh
// kiểu `string` — xem comment đầu cms.types.ts) đúng 1 lần bằng NodeJsonFields, cùng
// convention với SectionDTO — KHÔNG cast rải rác `as any` ở từng service method
// (node.service.ts export `NodeDTO` thô, chỉ dùng nội bộ ở đó).
import type { NodeDTO as RawNodeDTO } from '@/shared/services/node/node.service';
import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';
import type { Breakpoint } from '@core/hooks/useBreakpoint';
export type { Breakpoint };
import type { AnimationTimeline } from './animationTimeline.types';
export type { AnimationTimeline, AnimationKeyframe, AnimationProperty } from './animationTimeline.types';
import type { FieldDescriptor } from './node.fieldSchema.types';

export interface StyleObject {
    spacing?: { padding?: { t?: number; r?: number; b?: number; l?: number }; margin?: { t?: number; r?: number; b?: number; l?: number }; gap?: number };
    /** `objectFit` only affects `<img>`/`<video>` rendering (`applyNodeStyle` emits it
     * unconditionally — harmless no-op CSS on any other element) — added alongside
     * `width`/`height` so an Image node can crop a naturally-varied-aspect-ratio source
     * (e.g. admin-uploaded partner logos of any shape) into a uniform card thumbnail
     * without a bespoke component; the Inspector's "Kích thước" section is the first
     * place `size` is actually editable (previously type-only, no admin-facing UI). */
    size?: { width?: string; height?: string; minW?: string; maxW?: string; minH?: string; maxH?: string; sizeMode?: 'fixed' | 'fill' | 'hug'; objectFit?: 'cover' | 'contain' | 'fill' | 'none' };
    /** `color`'s `{type, value}` shape (2026-08-20 — media-fill text upgrade) lets text be
     * filled with a solid color, an image, a CSS gradient, or a video, all clipped to the
     * glyph shapes — see `applyNodeStyle.ts`'s typography branch and `TextNode.tsx`'s video
     * branch. `value` is a hex8 color for `solid`, a URL for `image`/`video`, or a raw CSS
     * gradient string for `gradient`. */
    typography?: { fontFamily?: string; size?: number; weight?: number; lineHeight?: number; letterSpacing?: number; color?: { type: 'solid' | 'image' | 'gradient' | 'video'; value: string }; align?: 'left' | 'center' | 'right' | 'justify'; transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; decoration?: 'none' | 'underline' | 'line-through'; maxLines?: number };
    /** 2026-08-19 — general overflow-clipping control (Node Builder Inspector's "Tràn nội
     * dung" / Overflow section). Closes a real gap found live: several hand-written "editorial"
     * node primitives had NO admin-facing way to opt into `overflow: hidden` when their own
     * content (a too-long headline, `white-space: nowrap` text) could overflow past the node's
     * box and — for a node with no clipping ancestor — widen the whole page (confirmed live:
     * exactly this caused a real horizontal-scroll bug on `/trang-chu`, fixed in code that time,
     * but any FUTURE Frame the admin builds through the generic Node tree has this same risk
     * with no way to fix it without a code change). `undefined` renders nothing (today's
     * behavior — CSS's own initial `overflow: visible` applies, byte-for-byte unchanged). */
    overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
    background?: { type?: 'color' | 'gradient' | 'image' | 'video'; value?: string; position?: string; size?: string; repeat?: string; overlay?: string };
    border?: { width?: number; style?: 'solid' | 'dashed' | 'dotted'; color?: string; radius?: { tl?: number; tr?: number; br?: number; bl?: number } };
    shadow?: Array<{ x: number; y: number; blur: number; spread: number; color: string; inset?: boolean }>;
    /** `grayscale` (0-100) added alongside `blur`/`backdropBlur`/`blendMode` — same "no
     * admin-facing UI yet" gap `size`/`transform` had, needed so a card image can start
     * desaturated and reveal color on hover (a `hoverStyle` override of this same field)
     * without a bespoke component. */
    effects?: { opacity?: number; blur?: number; backdropBlur?: number; blendMode?: string; grayscale?: number };
    /** `translateX`/`translateY` (px) added alongside `rotate`/`scaleX`/`scaleY` — needed for
     * the common "card lifts up a few px on hover" pattern; previously `transform` had no
     * Inspector UI at all (type-only), so this is the first release where any of it is
     * admin-editable. */
    transform?: { rotate?: number; scaleX?: number; scaleY?: number; translateX?: number; translateY?: number };
    /** Node Builder "no-code from primitives" upgrade (2026-08-20): lets ANY node declare a
     * style override that only applies while the mouse hovers a box — closes the gap that
     * previously forced bespoke one-off components (like the deleted `LogoGridNode`) for any
     * section wanting a hover micro-interaction, since inline `style=` (how every primitive
     * renders) cannot express `:hover` at all. See `applyNodeHoverStyle.ts` for how this
     * compiles to a real scoped `<style>` rule. Deliberately NOT recursive-editable in the
     * Inspector beyond a small practical subset (background/border/effects/transform) — see
     * NodeStyleTab.tsx's Hover section. */
    hover?: HoverStyleOverride;
}

/** Trimmed on purpose: only the properties that make sense as a *hover-only delta* (a card
 * lifting/glowing, an image losing its grayscale) — not layout-affecting groups like
 * `spacing`/`size`/`typography`, which would fight the node's own box during the transition
 * and have no established Inspector UX for "hover-only spacing" anyway. */
export interface HoverStyleOverride {
    /** 'self' (default) = applies while THIS node's own box is hovered. 'parent' = applies
     * while this node's PARENT node's box is hovered — e.g. an Image inside a card Frame
     * that should reveal color when hovering anywhere on the card, not just the image
     * itself (`applyNodeHoverStyle.ts` builds the matching descendant-combinator selector). */
    scope?: 'self' | 'parent';
    background?: StyleObject['background'];
    border?: StyleObject['border'];
    shadow?: StyleObject['shadow'];
    effects?: StyleObject['effects'];
    transform?: StyleObject['transform'];
    /** Trimmed to just `color` (not the full `typography` shape) — the one sub-property that's
     * purely visual (doesn't reflow layout, unlike `size`/`align`/`fontFamily`) and genuinely
     * common as a hover-only delta (e.g. a muted label brightening to full white on hover). */
    typography?: Pick<NonNullable<StyleObject['typography']>, 'color'>;
}

/** Runtime safety net for `typography.color`: any Node styled BEFORE this field became a
 * `{type,value}` union (either a stale `style` JSON already saved in the database, or a
 * hand-written call site that predates the type change and slipped past a pre-existing `as
 * any` cast — see `manageCmsPages.page.tsx`'s `seedSamplePage()`) still has a plain hex
 * string here at runtime, even though the TypeScript type now claims otherwise. Both
 * `applyNodeStyle.ts` (rendering) and `TypographyColorControl.tsx` (the Inspector, via
 * `NodeStyleTab.tsx`) read through this so old data degrades gracefully as `solid` mode
 * instead of silently losing its color or triggering the Select's auto-select-on-falsy-value
 * effect. */
export function normalizeTypographyColor(
    color: NonNullable<StyleObject['typography']>['color'] | string | undefined,
): NonNullable<StyleObject['typography']>['color'] | undefined {
    if (!color) return undefined;
    if (typeof color === 'string') return { type: 'solid', value: color };
    return color;
}

export interface FlowLayoutProps {
    // Trên container (áp dụng cho CON của node có layoutMode='flow')
    direction?: 'row' | 'column';
    wrap?: boolean;
    justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
    align?: 'start' | 'center' | 'end' | 'stretch';
    gap?: number;
    display?: 'flex' | 'grid';
    gridTemplate?: string;
    // Trên từng con (item-level, đọc từ layout của node CON đó)
    order?: number;
    grow?: number;
    shrink?: number;
    basis?: string;
    alignSelf?: 'start' | 'center' | 'end' | 'stretch';
    gridColumn?: string;
    gridRow?: string;
}

export interface FreeLayoutProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    zIndex?: number;
    constraints?: {
        horizontal?: 'left' | 'right' | 'center' | 'scale';
        vertical?: 'top' | 'bottom' | 'center' | 'scale';
    };
}

export type LayoutProps = FlowLayoutProps & FreeLayoutProps;

export interface DataBinding {
    mode: 'static' | 'boundField';
    field?: string;
}

export interface CollectionRepeat {
    /** Node-level data binding (2026-08-17) — default 'many' when unset, 100% behavior-preserving
     * for every existing row (every current consumer of `repeat` already assumes "returns a
     * list"). 'one' is the direct replacement for the old page-level `Page.dataBinding`: forces
     * `fetchRepeatEntries` to `limit:1` and is treated as a single-item repeat by the existing
     * sibling-cloning mechanism (0 or 1 clone instead of N) — see nodeDataBinding.ts/
     * resolveRenderableChildren.ts. */
    cardinality?: 'many' | 'one';
    source?: 'own' | 'related' | 'backlink' | 'mixed' | 'local';
    mode?: 'dynamic' | 'manual';
    contentTypeKey?: string;
    filter?: GenericDataSourceFilter[];
    entryIds?: string[];
    taxonomyFilter?: string[];
    sort?: { field: string; direction: 'ASC' | 'DESC' };
    limit?: number;
    matchField?: string;
    sourceContentTypeId?: string;
    /** FE-only, Inspector-time hint for `source: 'related'` — RelatedEntriesQueryInput has no
     * content-type parameter (content type of returned entries is only known after fetch, and
     * may vary per entry), so this is the admin's DECLARED ASSUMPTION, used only to compute
     * the Data Binding tab's available-fields list. Never read by fetchRepeatEntries/
     * resolveBoundValue — the actual runtime binding still just reads contextEntry[field] by
     * key, so a wrong assumption here only means a stale/wrong field LIST is shown in the
     * Inspector, never a runtime crash or wrong-content-type fetch. */
    relatedContentTypeKey?: string;
    /** Per-row `fieldMapping` values are `string | undefined` (not just `string`) so the admin
     * editor (`MixedSourcesEditor`, Canvas Editor v2 Task 13) can represent "cleared" via a
     * `clearable` <Select> writing `undefined` for a slot, same as every other slot-config
     * shape in this file (`TableColumnCfg`/`CardSlotsCfg`/`FeaturedEntrySlotsCfg` etc. all use
     * optional `?:` fields for the same reason). */
    sources?: { contentTypeId: string; limit?: number; fieldMapping?: Record<string, string | undefined> }[];
    /** Only meaningful when source==='local'. Admin-defined shape of one array item — reuses
     * the SAME FieldDescriptor[] type nodeRegistry.ts's fieldSchema already uses for repeater
     * itemFields (RepeaterFieldEditor.tsx), so the item-editing UI is the existing component,
     * not a new one. One level only (no nested repeaters), matching that existing constraint —
     * see NodeDataSourceTab.tsx's LocalItemFieldsEditor for the admin-facing editor. */
    localItemFields?: FieldDescriptor[];
    /** Only meaningful when source==='local'. The actual data — one Record per item, keyed by
     * localItemFields[].key, same shape RepeaterFieldEditor already produces for any other
     * repeater field in this codebase. */
    localItems?: Array<Record<string, unknown>>;
    /** Phase 0 M2a: khi true, mỗi entry trả về được gắn thêm `__detailHref` (URL trang Chi
     * tiết của chính entry đó) — dùng bởi Frame có `props.asLink=true` để render <a>. Tính
     * TRƯỚC ở fetchRepeatEntries (nơi đã biết source/contentTypeId), không tính lại ở nơi
     * render — khớp đúng cách hệ Section cũ resolve `detailPathPattern` 1 lần rồi tái dùng
     * cho mọi entry. */
    linkToDetail?: boolean;
    /** Node-level data binding (2026-08-17) — only meaningful when `cardinality` is 'many'
     * (default) and `source==='own'` + `mode==='dynamic'` (the only branch with real
     * offset/count support — see `fetchRepeatEntryCount` in nodeDataBinding.ts). Drives
     * TABLE/CARD_LIST's Prev/Next control. */
    pagination?: {
        /** 'reload' = plain `<a href="?page=N">`, a real SSR request per page (SEO-friendly, no
         * client JS) — fully verified live end-to-end (TableNode.tsx/CardListNode.tsx).
         * 'client' = an in-place refetch via a local Solid signal, no URL change (smoother, pages
         * beyond 1 not server-rendered/indexed) — was found live (2026-08-17) to be completely
         * non-interactive in a production build (Prev/Next rendered but never responded to
         * clicks; confirmed via native DOM click dispatch + `$$click` inspection). Root-caused to
         * NodeRenderer.tsx invoking the resolved node component as a raw function call
         * (`Comp()!({...})`) instead of through Solid's real `createComponent()` — this silently
         * never gave TABLE/CARD_LIST's own render body (the first primitives combining
         * `createResource` with real client interactivity) a working hydration boundary; the
         * ErrorBoundary caught a bare pending-resource signal instead of ever invoking the
         * component client-side. Fixed at the shared NodeRenderer.tsx call site (one line,
         * applies to every node type) — verified: client-side console.log now fires, the
         * `[CMS] ... Promise` console noise is gone, and Prev/Next fully work end-to-end
         * (confirmed live, in-place page updates, no URL change, no navigation). */
        mode: 'reload' | 'client';
        /** Query-string param carrying the page number in 'reload' mode. Default 'page'. */
        paramName?: string;
        pageSize: number;
    };
    /** Node-level data binding (2026-08-17) — only meaningful when `cardinality==='one'`.
     * Default 'hide' (render nothing — the node is simply omitted, matching how an empty repeat
     * list already renders 0 items). '404' makes `resolveCmsPageProps.ts` return a real HTTP 404
     * for the whole page when this node's filter resolves 0 entries. */
    onNotFound?: '404' | 'hide';
}

/** Column mapping for the `TABLE` Node primitive (`node.props.columns`) — see TableNode.tsx.
 * Declared here (not in admin/nodeBuilder/) because both the admin Inspector's Data Source tab
 * (writer) and the public-site renderer (reader) need it, and the renderer must never import
 * from the admin-only nodeBuilder/ directory. */
export interface TableColumnCfg {
    fieldKey: string;
    headerLabel: string;
    displayType: 'text' | 'image' | 'link' | 'date' | 'boolean';
}

/** Slot mapping for the `CARD_LIST` Node primitive (`node.props.slots`) — see CardListNode.tsx.
 * Same declared-once rationale as `TableColumnCfg` above. */
export interface CardSlotsCfg {
    imageField?: string;
    titleField?: string;
    subtitleField?: string;
    descriptionField?: string;
    badgeField?: string;
    ctaLabelField?: string;
}

/** Slot mapping for `FeaturedEntryNode` (`node.props.slots`) — Canvas Editor v2, Task 13,
 * replacing the legacy `node.props.fieldMapping` shape. Same declared-once rationale as
 * `TableColumnCfg`/`CardSlotsCfg` above (Task 14's public-site renderer needs this type too,
 * and must never import from the admin-only nodeBuilder/ directory). */
export interface FeaturedEntrySlotsCfg {
    imageField?: string;
    categoryField?: string;
    headingField?: string;
    descriptionField?: string;
}

/** Slot mapping for `ProjectShowcaseNode` (`node.props.slots`) — Canvas Editor v2, Task 13. */
export interface ShowcaseSlotsCfg {
    headingField?: string;
    imageField?: string;
    descriptionField?: string;
    clientField?: string;
    yearField?: string;
    categoryField?: string;
}

/** Slot mapping for `LogoGridNode` (`node.props.slots`) — Canvas Editor v2, Task 13. */
export interface LogoGridSlotsCfg {
    nameField?: string;
    logoField?: string;
}

export type VisibilityCondition =
    | { type: 'device'; value: 'mobile' | 'tablet' | 'desktop' }
    | { type: 'authState'; value: 'loggedIn' | 'loggedOut' }
    | { type: 'dateRange'; from?: string; to?: string }
    | { type: 'fieldValue'; field: string; operator: string; value: any }
    | { type: 'queryParam'; key: string; value: string };

export interface VisibilityRules {
    logic: 'AND' | 'OR';
    conditions: VisibilityCondition[];
}

export interface ResponsiveOverrides {
    tablet?: { style?: Partial<StyleObject>; layout?: Partial<LayoutProps> };
    mobile?: { style?: Partial<StyleObject>; layout?: Partial<LayoutProps> };
}

/** Field JSON của Node — đúng kiểu (xem comment đầu file) thay vì `string`. */
interface NodeJsonFields {
    style?: StyleObject;
    layout?: LayoutProps;
    props?: Record<string, any>;
    dataBinding?: DataBinding;
    repeat?: CollectionRepeat | null;
    visibilityRules?: VisibilityRules | null;
    responsiveOverrides?: ResponsiveOverrides;
    /** Phase 4 (Animation Timeline) — was a dead `string` inherited straight from
     * RawNodeDTO; now a real structured object, added to NodeJsonFields (the block of
     * fields re-typed away from the raw codegen'd shape) for the first time. */
    animationRef?: AnimationTimeline;
}

export type NodeDTO = Omit<RawNodeDTO, keyof NodeJsonFields> & NodeJsonFields;

/** A NodeDTO plus its resolved children, produced by buildNodeTree() (Task 13). */
export interface NodeTree extends NodeDTO {
    children: NodeTree[];
}

/** Data-binding "context" passed down the tree during render — the current entry
 * (if any) that boundField/repeat resolve against, plus visibility inputs. See spec §3. */
export interface NodeRenderContext {
    contextEntry?: Record<string, any>;
    /** Final-review fix Critical #1: `contextEntry` is standardized on the FLAT field-data
     * shape (no `id` inside it — matches CmsPageShell.astro's `pageEntry?.data` and what
     * `resolveBoundValue`/`evaluateVisibilityRules` index by field key). The 2 consumers that
     * need the entry's OWN id (nodeDataBinding.ts's `fetchRepeatEntries` 'related'/'backlink'
     * branches) read it from this separate field instead of reaching into `contextEntry`. */
    contextEntryId?: string;
    /** Canvas Editor v2, Task 12 — the bound ContentEntry's contentTypeId, threaded down
     * alongside contextEntry/contextEntryId. Lets ContentDetailNode resolve which content
     * type's field DEFINITIONS to fetch (for hero/title/body slot rendering) without needing
     * its own static node.props.contentTypeId — the ancestor cardinality:'one' node (whichever
     * supplied contextEntry) is the single source of truth. Falls back to the node's own
     * legacy static contentTypeId (see ContentDetailNode.tsx) for pages that predate this
     * field — never a breaking change for already-migrated pages. */
    contextEntryContentTypeId?: string;
    isCustomerLoggedIn: boolean;
    /** Phase 3 (Responsive) — was a static string, now a reactive accessor so any
     * node reading it (evaluateVisibilityRules.ts's 'device' condition, and
     * applyNodeStyle/applyNodeLayout's responsive-override merge) automatically
     * recomputes when the underlying breakpoint changes — a real window resize on
     * the public site (useBreakpoint()), or the admin's manual preview switcher on
     * the Node Builder canvas (previewBreakpoint signal). Every construction site
     * must supply a live accessor, not a plain string — see ResponsiveNodeTree.tsx
     * (public site), previewCmsPage.page.tsx (draft preview), and
     * NodeBuilder.page.tsx's `previewBreakpoint` (admin canvas). */
    device: () => Breakpoint;
    queryParams: Record<string, string>;
    pathParams: Record<string, string>;
    now: Date;
    /** Final-review fix Important #2: locale của trang đang xem (`resolved.locale`,
     * resolveCmsPageProps.ts) — PHẢI truyền xuống `fetchRepeatEntries` (NodeRenderer.tsx's
     * NodeChildrenList), cùng lớp bug đã fix 1 lần cho Section's data pipeline ("Critical #1
     * fix" ở resolveCmsPageProps.ts): thiếu nó thì entry của MỌI locale trong 1 nhóm dịch trộn
     * lẫn vào cùng 1 khối repeat. Optional vì admin canvas (NodeBuilder.page.tsx) không có
     * trang public thật đang xem — không truyền gì, giữ hành vi cũ (không lọc). */
    locale?: string;
    /** Node-level data binding (2026-08-17) — nodes resolved during `resolveCmsPageProps.ts`'s
     * pre-render 404 scan (any `cardinality:'one'` + `onNotFound:'404'` node), keyed by node id,
     * so `NodeChildrenList`'s `createResource` can skip a duplicate network round-trip for a node
     * already fetched during that scan. Always `undefined` on the admin canvas (NodeBuilder.page.tsx
     * has no SSR 404 pre-check) and in any construction site that doesn't do that scan — those
     * fall back to fetching normally, identical to before this field existed. */
    prefetchedRepeatEntries?: Map<string, Record<string, any>[]>;
    /** Phase 0 M2a: URL trang Chi tiết của contextEntry hiện tại (nếu repeat của node cha có
     * `linkToDetail: true`) — Frame với `props.asLink=true` đọc field này để quyết định render
     * <a href=...> hay <div>. undefined = không phải context trong 1 repeat có linkToDetail,
     * hoặc entry đó không suy được URL (thiếu field, content-type chưa có trang Chi tiết...). */
    contextHref?: string;
    /** Task 7: click-to-select wiring cho canvas của Node Builder (NodeBuilder.page.tsx) —
     * hoàn toàn optional, CHỈ được truyền bởi trang builder đó khi dựng `NodeRenderContext`
     * cho `<NodeRenderer>` gắn trên canvas. Mọi nơi khác dựng NodeRenderContext (trang public
     * thật qua CmsPageShell.astro, mock-entry preview...) không set field này => `undefined`
     * => NodeRenderer.tsx không gắn thêm onClick/outline nào cả, hành vi render giữ nguyên
     * 100% như trước Task 7. */
    builderSelection?: {
        isSelected: (id: string) => boolean;
        /** Gọi khi user click vào 1 node trên canvas — TỰ `e.stopPropagation()` bên trong
         * (NodeBuilder.page.tsx's implementation), để click vào 1 node con không đồng thời
         * "chọn luôn" node cha bao ngoài nó (mỗi lần click chỉ chọn ĐÚNG 1 node — node sâu
         * nhất dưới con trỏ chuột). NodeRenderer.tsx chỉ việc gọi thẳng hàm này, không tự xử
         * lý stopPropagation/shiftKey/ctrlKey gì thêm ở phía nó. */
        onSelectClick: (id: string, e: MouseEvent) => void;
        /**
         * M1c (Task 2) — mọi field dưới đây đều MỚI và optional, thêm thuần tuý additive cho
         * canvas direct-manipulation (drag/resize/rotate) sắp rewire trong NodeRenderer.tsx:
         * KHÔNG có construction site nào của `NodeRenderContext`/`builderSelection` hiện có
         * (trang public thật, mock-entry preview, NodeBuilder.page.tsx's Task 7 click-to-select
         * wiring) cần khai báo field nào trong nhóm này để tiếp tục typecheck — để trống hết
         * (`undefined`) giữ nguyên hành vi render 100% như trước Task 2, cùng nguyên tắc mà
         * `builderSelection?` bản thân nó (optional trên NodeRenderContext) đã thiết lập.
         */
        /** Toàn bộ tập id đang được chọn hiện tại — dạng hàm (không phải field tĩnh) để luôn
         * đọc giá trị SỐNG tại thời điểm gọi, cùng convention `isSelected` bên trên. Optional
         * (khác brief's sketch ban đầu — không có `?:`) để giữ đúng cam kết additive/inert:
         * NodeBuilder.page.tsx's Task 7 construction site hiện có (dòng ~167) chỉ khai
         * `isSelected`/`onSelectClick`, chưa dựng field này — bắt buộc field này sẽ làm site đó
         * gãy typecheck (`ts(2739)`, xác nhận thật lúc viết task này) mà không có lý do chức
         * năng nào bắt buộc phải vậy ở Task 2 (chưa rewire canvas dùng nó). */
        selectedIds?: () => Set<string>;
        /** Đăng ký/hủy đăng ký DOM element thật của 1 node — truyền `null` để hủy đăng ký (node
         * unmount). Canvas cần tham chiếu DOM thật (không chỉ id) để đo bounding box lúc vẽ
         * outline/handle chọn, và để tính toạ độ con trỏ tương đối lúc drag/resize/rotate.
         * Optional — cùng lý do `selectedIds` ở trên. */
        registerElement?: (id: string, el: HTMLElement | null) => void;
        /** Node cha có `parentId` cho trước có phải kiểu container hỗ trợ kéo-thả tự do
         * (free-layout, `layoutMode`='free' — xem `FreeLayoutProps`) hay không — canvas dùng
         * để quyết định có gắn `onDragStart`/handle resize-rotate cho 1 node hay không (node
         * nằm trong 1 container 'flow' không kéo tự do được, chỉ reorder qua Layers panel).
         * Optional — cùng lý do `selectedIds` ở trên. */
        isDraggableParent?: (parentId: string | undefined) => boolean;
        /** Bắt đầu kéo-thả tự do 1 node (thay đổi `layout.x`/`layout.y`) — optional vì không
         * phải mọi node đều kéo được (xem `isDraggableParent`); NodeRenderer.tsx chỉ gắn
         * pointerdown handler này khi nó tồn tại. */
        onDragStart?: (id: string, e: PointerEvent) => void;
        /** Bắt đầu resize 1 node từ 1 trong 8 handle (góc/cạnh) — xem `ResizeHandle`. */
        onResizeStart?: (id: string, handle: ResizeHandle, e: PointerEvent) => void;
        /** Bắt đầu xoay 1 node (thay đổi `layout.rotation`). */
        onRotateStart?: (id: string, e: PointerEvent) => void;
        /** M1c final-review fix I4 — kích thước RENDER THẬT (đo qua DOM, `offsetWidth`/
         * `offsetHeight`) của node `id`, đọc từ cùng `elementRegistry` mà `registerElement`
         * ghi vào. Dùng làm fallback khi `layout.width`/`height` chưa được set (mọi node
         * mới tạo — `handleAdd` không gửi `layout` gì cả): `applyChildLayout` bỏ hẳn
         * width/height khỏi CSS lúc đó, để node tự co theo nội dung (kích thước thật KHÔNG
         * phải 0) — nhưng `NodeCanvasOverlay` trước đây mặc định về `0` cho case này, làm
         * khung chọn/handle collapse về 1 chấm ~4px. `undefined` nếu node chưa đăng ký
         * (chưa mount) — caller tự fallback tiếp về 0 trong trường hợp đó. */
        getElementSize?: (id: string) => { width: number; height: number } | undefined;
    };
}

/** 8 handle resize trên khung chọn của canvas — 4 góc (nw/ne/se/sw) + 4 cạnh (n/e/s/w). */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
