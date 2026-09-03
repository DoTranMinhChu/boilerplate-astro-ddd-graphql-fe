// Kiểu dữ liệu cho toàn bộ FE CMS — suy ra từ typed-graphql (qua các service
// trong @shared/services) thay vì hand-declare lại field theo backend.
//
// Ngoại lệ có chủ đích: các field JSONB linh hoạt (Node.style/layout/props/dataBinding/repeat/
// visibilityRules/responsiveOverrides, ContentEntry.data) dùng scalar GraphQLMixed — codegen
// (typed-graphql-builder) không nhận diện scalar tuỳ biến này nên phát sinh field type là
// `string` thay vì `any`/unknown (xem @shared/generated/typed-graphql.ts). Đây là giới hạn
// của tool codegen, không phải data thật — override lại đúng 1 lần ở đây (xem node.types.ts,
// NodeJsonFields), KHÔNG cast rải rác `as any` ở từng component. Lưu ý: dataSource/legacyAnimation
// nằm TRONG node.props (untyped stopgap), không phải field top-level riêng.
import type { GetOutput } from '@shared/generated/typed-graphql';
import { CrudService } from '@/shared/services/crud.service';
import type { PageDTO } from '@/shared/services/page/page.service';
import type { ContentEntryDTO as RawContentEntryDTO } from '@/shared/services/contentEntry/contentEntry.service';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import type { EFilterOperator } from '@core/api/types';

export type SeoData = GetOutput<typeof CrudService.seoFragment>;
export type { PageDTO };

/** 1 field của ContentType — output (query) và input (mutation) có shape giống
 * hệt nhau (mục 4.6 spec CMS), nên NonNullable 2 lớp là đủ (list item nào cũng
 * nullable vì framework GraphQL nội bộ không dùng NonNull — xem graphQL.decorators.ts). */
export type FieldDefinitionDTO = NonNullable<NonNullable<ContentTypeDTO['fields']>[number]>;
export type { ContentTypeDTO };

/** Task 14 (enum/type-safety sweep) — discriminant for a REPEATER field's
 * `FieldDefinitionDTO.displayVariant` (public Detail page rendering, see
 * ContentDetailNode.tsx's `RepeaterFieldDisplay` + FieldDefinitionArrayInput.tsx's admin
 * picker). `displayVariant` itself stays the raw `string | undefined` the GraphQL codegen
 * produces (see this file's header comment on JSONB/scalar codegen limits) — this const only
 * types the FE-side comparisons/casts against it, same convention as `EDataBindingMode`/
 * `ERepeatSource` in node.types.ts.
 *
 * Declared HERE (not inline in ContentDetailNode.tsx, despite that being where the brief first
 * looked) — ContentDetailNode.tsx is a public-page NODE PRIMITIVE that pulls in DOMPurify,
 * ContentTypeService, and ContentEntryService as real runtime imports; FieldDefinitionArrayInput.tsx
 * is an ADMIN content-type editor that currently imports none of that. Declaring the enum there
 * would have forced a real (non-type-only) import from ContentDetailNode.tsx into the admin
 * form just to reach a 3-value const, dragging that whole public-rendering runtime chain into
 * the admin bundle — the same class of problem Task 13 hit with FrameNode.tsx/GSAP. cms.types.ts
 * is already the shared, mostly-type-only home for `FieldDefinitionDTO` itself (its only real
 * runtime import, `CrudService`, is a lightweight GraphQL-fragment base class every CMS service
 * already extends), so both consumers reach it equally cheaply. */
export const EFieldDisplayVariant = { LIST: 'list', CARDS: 'cards', ACCORDION: 'accordion' } as const;
export type EFieldDisplayVariant = (typeof EFieldDisplayVariant)[keyof typeof EFieldDisplayVariant];

export interface MixedFeedSource {
    contentTypeId: string;
    limit?: number;
    /** Field-mapping RIÊNG cho content type này — mỗi Object Type trộn vào feed có
     * field key khác nhau nên không thể dùng chung 1 fieldMapping như content-grid. */
    fieldMapping?: { heading?: string; image?: string; description?: string };
}

/** Discriminant for `GenericDataSourceFilter.valueSource` (final whole-branch review, Important
 * #2 — FE mirror of BE's own Task 3 `EFilterValueSource`). Same `as const` convention as
 * `EFieldDisplayVariant` above; see `CMS_VALUE_SOURCE_OPTIONS`, cmsFilterOperator.constants.ts
 * for the shared option-list this collapses (was duplicated verbatim in
 * GenericFilterListInput.tsx and NodeDataSourceTab.tsx). */
export const EFilterValueSource = { STATIC: 'static', PATH_PARAM: 'pathParam', QUERY_PARAM: 'queryParam' } as const;
export type EFilterValueSource = (typeof EFilterValueSource)[keyof typeof EFilterValueSource];

/** 1 điều kiện lọc cho GenericDataSourceConfig (mục 3 design Phase 2b) — giá trị lấy
 * từ 1 trong 3 nguồn: gõ tay cố định, đoạn path động của trang (":param"), hoặc query
 * string (?key=value). `resolveGenericDataSource()` biến nó thành giá trị cụ thể. */
export interface GenericDataSourceFilter {
    field: string;
    valueSource: EFilterValueSource;
    staticValue?: string;
    paramName?: string;
    /** Task 9 (enum/type-safety sweep §3.7): was a hand-typed 8-member string-literal union
     * (already `$`-prefixed, coincidentally matching `EFilterOperator`'s own spelling) — now
     * expressed via the actual enum members instead, same 8-of-15 subset kept (nothing in this
     * codebase consumes a `GenericDataSourceFilter` with an operator outside this narrower set
     * today — the 4 admin option-list UIs that edit this field only ever exposed 6-7 of these 8
     * members each; see `CMS_FILTER_OPERATOR_OPTIONS`, cmsFilterOperator.constants.ts). */
    operator?: EFilterOperator.EQUALS | EFilterOperator.NOT_EQUALS | EFilterOperator.GREATER_THAN
        | EFilterOperator.GREATER_THAN_OR_EQUAL | EFilterOperator.LESS_THAN | EFilterOperator.LESS_THAN_OR_EQUAL
        | EFilterOperator.LIKE | EFilterOperator.IN;
}

/** Page.dataBinding (Phase 0 M1 Task 11) — the Node-tree equivalent of a Section's
 * CONTENT_DETAIL block: marks this Page as a "detail page" bound to 1 Content Type,
 * matched against the current URL via `genericFilters` (same shape/engine as
 * SectionDataSource.genericFilters — `resolveGenericDataSource()`), so exactly 1
 * entry resolves per request. BE stores as Mixed JSONB (page.entity.ts's
 * `dataBinding`, no dedicated GraphQL input type — see PageDTO override below).
 * `mode` kept explicit (not inferred from presence of contentTypeId) so a future
 * page-level dataBinding mode can coexist without ambiguity. */
export interface PageDataBinding {
    mode: 'detail';
    contentTypeId?: string;
    genericFilters?: GenericDataSourceFilter[];
}

export interface SectionDataSource {
    mode?: 'manual' | 'dynamic' | 'detail';
    ids?: string[];
    query?: {
        contentTypeId?: string;
        limit?: number;
        sort?: { field?: string; direction?: 'ASC' | 'DESC' };
    };
    /** RELATED_ENTRIES — chỉ dùng trên trang Chi tiết, không cần contentTypeId (ngầm
     * định = cùng loại với entry đang xem). Để trống matchField = "cùng loại, mới nhất". */
    matchField?: string;
    limit?: number;
    /** MIXED_FEED — trộn nhiều Object Type vào 1 feed duy nhất. */
    sources?: MixedFeedSource[];
    /** BACKLINK_ENTRIES — hướng NGƯỢC với matchField: content type nào (khác trang
     * hiện tại) đang có field RELATION trỏ về entry đang xem, vd trang Chi tiết danh
     * mục hiện danh sách bài viết thuộc danh mục đó. */
    sourceContentTypeId?: string;
    /** GenericDataSourceConfig filters (mục 3/5 design Phase 2b) — CONTENT_GRID pilot
     * only. Khi có giá trị (mảng không rỗng), resolveSectionDataSource dùng đường
     * resolveGenericDataSource() thay vì chỉ contentTypeId/limit/sort tĩnh như trước. */
    genericFilters?: GenericDataSourceFilter[];
    /** FORM (Phase 4 mục 1, Task 5) — id của 1 Form đã tạo ở trang admin Forms (Task 4) mà
     * block này render công khai. Không cần contentTypeId/query — Form là entity riêng, không
     * phải ContentType. */
    formId?: string;
}

/** Field JSON của ContentEntry — `data` là { [fieldKey]: value } theo FieldDefinition[]. */
export type ContentEntryDTO = Omit<RawContentEntryDTO, 'data'> & { data?: Record<string, any> };

/** Binding của 1 trang Chi tiết publish cho 1 contentTypeId — trả về bởi
 * `getPublicDetailPathByContentType` (Fix Important #3, γ final review). Trước đây FE chỉ có
 * `path` pattern (String) và TỰ GIẢ ĐỊNH field key feed-URL/param name trong path đều tên
 * "slug" để build href — sai với content type dùng field feed-URL tên khác (bug thật xác nhận
 * với content type "QA Gamma Task5", field `duongDan`).
 *
 * Phase 3 mục 2: path Chi tiết có thể cần NHIỀU param (vd `/:danhMuc/:slug`, lồng cấp cha-con)
 * — `paramName`/`fieldKey` đơn không đủ diễn tả N param, nay đổi sang `bindings` (mảng), mỗi
 * phần tử ứng với 1 param trong `path`. Build href ĐÚNG bằng cách thay TỪNG param, không đoán
 * — xem `resolveDetailHref()` (dùng chung cho mọi nơi tiêu thụ, trả undefined nếu thiếu giá trị
 * ở BẤT KỲ field nào trong `bindings`).
 */
export interface DetailPathBindingItemDTO {
    paramName: string;
    fieldKey: string;
}

export interface DetailPathBindingDTO {
    path: string;
    bindings: DetailPathBindingItemDTO[];
}

/** 1 bản dịch khác (PUBLISHED, khác locale trang đang xem) của cùng nhóm dịch — nguồn cho bộ
 * chuyển ngôn ngữ ở SiteHeader (Phase 3 mục 3, Task 15). Trả về bởi query công khai
 * `getPageTranslations` (PageService.getPageTranslations) — xem `CmsPageProps.availableTranslations`. */
export interface PageTranslationDTO {
    locale: string;
    path: string;
}

/** Nền/font riêng cho TOÀN trang (Page.style — "Cài đặt trang" trong Page Builder),
 * khác Style tab của từng Section (chỉ đổi 1 khối). 5 kiểu nền hỗ trợ: trong suốt/
 * màu phẳng/gradient 2 màu/ảnh (mờ + lớp phủ)/video lặp (lớp phủ). */
export type PageBackgroundType = 'transparent' | 'color' | 'gradient' | 'image' | 'video';

export interface PageStyle {
    backgroundType?: PageBackgroundType;
    backgroundColor?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientAngle?: number;
    backgroundImage?: string;
    backgroundImageBlur?: number;
    backgroundVideo?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    fontFamily?: string;
}
