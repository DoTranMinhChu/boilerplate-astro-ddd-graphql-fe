// Kiểu dữ liệu cho toàn bộ FE CMS — suy ra từ typed-graphql (qua các service
// trong @shared/services) thay vì hand-declare lại field theo backend.
//
// Ngoại lệ có chủ đích: các field JSONB linh hoạt (Section.content/dataSource/
// fieldMapping/visibilityRules/responsiveSettings/animation, ContentEntry.data)
// dùng scalar GraphQLMixed — codegen (typed-graphql-builder) không nhận diện
// scalar tuỳ biến này nên phát sinh field type là `string` thay vì `any`/unknown
// (xem @shared/generated/typed-graphql.ts). Đây là giới hạn của tool codegen,
// không phải data thật — override lại đúng 1 lần ở đây bằng `JsonFieldsOf<>`,
// KHÔNG cast rải rác `as any` ở từng component.
import type { GetOutput } from '@shared/generated/typed-graphql';
import { CrudService } from '@/shared/services/crud.service';
import type { PageDTO } from '@/shared/services/page/page.service';
import type { SectionDTO as RawSectionDTO } from '@/shared/services/section/section.service';
import type { ContentEntryDTO as RawContentEntryDTO } from '@/shared/services/contentEntry/contentEntry.service';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';

export type SeoData = GetOutput<typeof CrudService.seoFragment>;
export type { PageDTO };

/** 1 field của ContentType — output (query) và input (mutation) có shape giống
 * hệt nhau (mục 4.6 spec CMS), nên NonNullable 2 lớp là đủ (list item nào cũng
 * nullable vì framework GraphQL nội bộ không dùng NonNull — xem graphQL.decorators.ts). */
export type FieldDefinitionDTO = NonNullable<NonNullable<ContentTypeDTO['fields']>[number]>;
export type { ContentTypeDTO };

export interface AnimationLayer {
    target: string;
    preset: string;
    order?: number;
    delay?: number;
    speed?: 'slow' | 'medium' | 'fast';
    trigger?: string;
    mobileEnabled?: boolean;
}

/** 1 phần tử trong khối "Tự tạo" kiểu Notion — ghép nhiều phần tử để tự dựng bố cục
 * bất kỳ (tiêu đề/chữ/ảnh/nút/khoảng trắng/gạch ngang) mà không cần chọn 1 khối cố
 * định có sẵn. `id` ổn định (không đổi khi kéo sắp xếp lại) — dùng làm animation
 * target cho từng phần tử qua Inspector › Tab Hiệu ứng. */
export interface CustomBlockElement {
    id: string;
    type: 'heading' | 'text' | 'image' | 'button' | 'spacer' | 'divider';
    text?: string;
    level?: 'h2' | 'h3' | 'h4';
    href?: string;
    image?: string;
    align?: 'left' | 'center' | 'right';
    spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface MixedFeedSource {
    contentTypeId: string;
    limit?: number;
    /** Field-mapping RIÊNG cho content type này — mỗi Object Type trộn vào feed có
     * field key khác nhau nên không thể dùng chung 1 fieldMapping như content-grid. */
    fieldMapping?: { heading?: string; image?: string; description?: string };
}

/** 1 điều kiện lọc cho GenericDataSourceConfig (mục 3 design Phase 2b) — giá trị lấy
 * từ 1 trong 3 nguồn: gõ tay cố định, đoạn path động của trang (":param"), hoặc query
 * string (?key=value). `resolveGenericDataSource()` biến nó thành giá trị cụ thể. */
export interface GenericDataSourceFilter {
    field: string;
    valueSource: 'static' | 'pathParam' | 'queryParam';
    staticValue?: string;
    paramName?: string;
    operator?: '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$like' | '$in';
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
}

export interface SectionResponsiveSettings {
    mobileOrder?: number;
    hideOnMobile?: boolean;
    spacing?: 'sm' | 'md' | 'lg';
}

export interface SectionVisibilityRules {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
    startAt?: string | null;
    endAt?: string | null;
}

/** No-code style controls (Page Builder Style tab) — applied by SectionRenderer as
 * CSS custom properties; section components fall back to their own defaults when absent. */
export interface SectionStyle {
    theme?: 'light' | 'dark' | 'brand';
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
    spacing?: 'sm' | 'md' | 'lg';
}

/** Field JSON của Section, đúng kiểu (xem comment đầu file) thay vì `string`. */
interface SectionJsonFields {
    content?: Record<string, any>;
    dataSource?: SectionDataSource;
    fieldMapping?: Record<string, string>;
    visibilityRules?: SectionVisibilityRules;
    responsiveSettings?: SectionResponsiveSettings;
    animation?: AnimationLayer[];
    style?: SectionStyle;
}

export type SectionDTO = Omit<RawSectionDTO, keyof SectionJsonFields> & SectionJsonFields;

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

/** 1 entry đã resolve xong trong 1 feed trộn nhiều Object Type (MIXED_FEED) — giữ
 * riêng fieldMapping/detailPathPattern của ĐÚNG content type nó thuộc về, vì mỗi
 * nguồn trong feed có field key và trang Chi tiết publish khác nhau. */
export interface ResolvedMixedEntry {
    entry: ContentEntryDTO;
    contentTypeId: string;
    fieldMapping: { heading?: string; image?: string; description?: string };
    detailPathPattern?: DetailPathBindingDTO | null;
}

/** Section sau khi đã resolve xong dynamic data source ở SSR — sẵn sàng render. */
export interface ResolvedSection extends SectionDTO {
    entries?: ContentEntryDTO[];
    /** Binding (path pattern + paramName + fieldKey thật) của trang detail cho contentType
     * này, nếu có publish — xem DetailPathBindingDTO. */
    detailPathPattern?: DetailPathBindingDTO | null;
    /** Chỉ MIXED_FEED dùng — xem ResolvedMixedEntry. */
    mixedEntries?: ResolvedMixedEntry[];
}

/** 1 giá trị field RELATION đã "join" xong — tên hiển thị thật (không phải raw id)
 * + link tới trang Chi tiết của entry đó, nếu content type đích có publish 1 trang
 * Chi tiết. `href` undefined = vẫn hiện tên nhưng không phải link (chưa có trang). */
export interface RelationDisplayItem {
    id: string;
    label: string;
    href?: string;
}

/** 1 giá trị field TAXONOMY đã "join" xong — tên hiển thị thật của Term (không phải raw
 * id). Không có `href` như RelationDisplayItem vì Term không có trang riêng của nó. */
export interface TaxonomyDisplayItem {
    id: string;
    label: string;
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
