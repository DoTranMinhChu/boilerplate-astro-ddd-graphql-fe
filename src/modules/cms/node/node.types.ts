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
}
