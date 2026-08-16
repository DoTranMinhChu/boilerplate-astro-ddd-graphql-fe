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

export interface StyleObject {
    spacing?: { padding?: { t?: number; r?: number; b?: number; l?: number }; margin?: { t?: number; r?: number; b?: number; l?: number }; gap?: number };
    size?: { width?: string; height?: string; minW?: string; maxW?: string; minH?: string; maxH?: string; sizeMode?: 'fixed' | 'fill' | 'hug' };
    typography?: { fontFamily?: string; size?: number; weight?: number; lineHeight?: number; letterSpacing?: number; color?: string; align?: 'left' | 'center' | 'right' | 'justify'; transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; decoration?: 'none' | 'underline' | 'line-through' };
    background?: { type?: 'color' | 'gradient' | 'image' | 'video'; value?: string; position?: string; size?: string; repeat?: string; overlay?: string };
    border?: { width?: number; style?: 'solid' | 'dashed' | 'dotted'; color?: string; radius?: { tl?: number; tr?: number; br?: number; bl?: number } };
    shadow?: Array<{ x: number; y: number; blur: number; spread: number; color: string; inset?: boolean }>;
    effects?: { opacity?: number; blur?: number; backdropBlur?: number; blendMode?: string };
    transform?: { rotate?: number; scaleX?: number; scaleY?: number };
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
    source?: 'own' | 'related' | 'backlink' | 'mixed';
    mode?: 'dynamic' | 'manual';
    contentTypeKey?: string;
    filter?: GenericDataSourceFilter[];
    entryIds?: string[];
    taxonomyFilter?: string[];
    sort?: { field: string; direction: 'ASC' | 'DESC' };
    limit?: number;
    matchField?: string;
    sourceContentTypeId?: string;
    sources?: { contentTypeId: string; limit?: number; fieldMapping?: Record<string, string> }[];
    /** Phase 0 M2a: khi true, mỗi entry trả về được gắn thêm `__detailHref` (URL trang Chi
     * tiết của chính entry đó) — dùng bởi Frame có `props.asLink=true` để render <a>. Tính
     * TRƯỚC ở fetchRepeatEntries (nơi đã biết source/contentTypeId), không tính lại ở nơi
     * render — khớp đúng cách hệ Section cũ resolve `detailPathPattern` 1 lần rồi tái dùng
     * cho mọi entry. */
    linkToDetail?: boolean;
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
    isCustomerLoggedIn: boolean;
    device: 'mobile' | 'tablet' | 'desktop';
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
    };
}

/** 8 handle resize trên khung chọn của canvas — 4 góc (nw/ne/se/sw) + 4 cạnh (n/e/s/w). */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
