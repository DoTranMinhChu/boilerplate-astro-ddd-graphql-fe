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

export interface SectionDataSource {
    mode?: 'manual' | 'dynamic';
    ids?: string[];
    query?: {
        contentTypeId?: string;
        limit?: number;
        sort?: { field?: string; direction?: 'ASC' | 'DESC' };
    };
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

/** Section sau khi đã resolve xong dynamic data source ở SSR — sẵn sàng render. */
export interface ResolvedSection extends SectionDTO {
    entries?: ContentEntryDTO[];
    /** Path pattern (vd "/du-an/:slug") của trang detail cho contentType này, nếu có publish. */
    detailPathPattern?: string | null;
}
