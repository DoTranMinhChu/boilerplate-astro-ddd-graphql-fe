import { PageService } from '@/shared/services/page/page.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { RedirectService } from '@/shared/services/redirect/redirect.service';
import type { HeaderPresetDTO } from '@/shared/services/headerPreset/headerPreset.service';
import type { FooterPresetDTO } from '@/shared/services/footerPreset/footerPreset.service';
import type { ResolvedSection, SectionDTO, FieldDefinitionDTO, SeoData, ContentEntryDTO } from '@/modules/cms/cms.types';

export interface CmsPageProps {
    seo: SeoData | undefined;
    sections: ResolvedSection[];
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
    header?: HeaderPresetDTO;
    footer?: FooterPresetDTO;
}

/**
 * CHỈ điểm vào GraphQL cho toàn bộ public site — gọi từ Astro frontmatter
 * (SSR) trong index.astro / [...path].astro. Dùng đúng service (PageService/
 * ContentEntryService/ContentTypeService) như phía admin, không tự chế client
 * riêng (BaseService.queryApi đã an toàn SSR — xem core/api/graphql.ts).
 *
 * Resolve toàn bộ trong 1 lượt: page + sections + fill sẵn `entries` cho mọi
 * section có dataSource (manual hoặc dynamic) + field definition cho trang
 * COLLECTION_DETAIL — public site không cần gọi GraphQL thêm lần nào ở client.
 *
 * `preview: true` gọi `previewPageResolver` (yêu cầu đăng nhập, bỏ qua điều
 * kiện PUBLISHED) — CHỈ dùng từ trang preview trong admin SPA (đã có JWT qua
 * AuthProvider), không gọi được từ Astro SSR public (không có token).
 */
export async function resolveCmsPageProps(path: string, options: { preview?: boolean } = {}): Promise<CmsPageProps | null> {
    const resolved = options.preview
        ? await PageService.previewPageResolver({ path })
        : await PageService.pageResolver({ path });
    if (!resolved?.page) return null;

    const sections = await Promise.all(
        filterDefined(resolved.sections)
            .map(asJsonTyped<SectionDTO>)
            .filter((s) => s.enabled)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(resolveSectionDataSource),
    );

    let contentTypeFields: FieldDefinitionDTO[] | undefined;
    if (resolved.page.pageType === 'COLLECTION_DETAIL' && resolved.page.contentTypeId) {
        const contentType = await ContentTypeService.getOneContentType({ id: resolved.page.contentTypeId });
        contentTypeFields = filterDefined(contentType?.fields);
    }

    const hasResultSeo = !!resolved.seo && Object.values(resolved.seo).some((v) => v !== undefined && v !== null);
    const seo: SeoData | undefined = hasResultSeo ? resolved.seo : resolved.page.seo;
    const pageEntry = resolved.entry ? asJsonTyped<ContentEntryDTO>(resolved.entry) : undefined;
    const header = resolved.header ? asJsonTyped<HeaderPresetDTO>(resolved.header) : undefined;
    const footer = resolved.footer ? asJsonTyped<FooterPresetDTO>(resolved.footer) : undefined;

    return { seo, sections, pageEntry, contentTypeFields, header, footer };
}

/** Fill `entries`/`detailPathPattern` cho 1 section nếu nó khai báo dataSource
 * (manual hoặc dynamic) — xem mục 9 spec CMS. Section không cần data source
 * (Hero/CTA...) trả về nguyên trạng. Exported so the Page Builder canvas (which
 * edits sections locally, outside the full page resolve) can stay WYSIWYG for
 * content-grid blocks without duplicating this logic. */
export async function resolveSectionDataSource(section: SectionDTO): Promise<ResolvedSection> {
    const ds = section.dataSource;
    const contentTypeId = ds?.query?.contentTypeId;
    if (!ds?.mode || !contentTypeId) return section;

    const detailPathPattern = await PageService.getPublicDetailPathByContentType({ contentTypeId });

    if (ds.mode === 'manual' && ds.ids?.length) {
        const entries = await ContentEntryService.getPublicContentEntries({ contentTypeId, ids: ds.ids });
        return { ...section, entries: filterDefined(entries).map(asJsonTyped<ContentEntryDTO>), detailPathPattern };
    }
    if (ds.mode === 'dynamic') {
        const entries = await ContentEntryService.getPublicContentEntries({
            contentTypeId,
            limit: ds.query?.limit,
            sortField: ds.query?.sort?.field,
            sortDirection: ds.query?.sort?.direction,
        });
        return { ...section, entries: filterDefined(entries).map(asJsonTyped<ContentEntryDTO>), detailPathPattern };
    }
    return section;
}

function filterDefined<T>(items: (T | undefined)[] | undefined): T[] {
    return (items || []).filter((i): i is T => i !== undefined);
}

/**
 * Điểm cast DUY NHẤT cho các field GraphQLMixed (content/dataSource/data/...) —
 * typed-graphql-builder không nhận diện scalar Mixed nên field type sinh ra là
 * `string`, dù giá trị thật lúc runtime luôn là object JSON (xem comment đầu
 * cms.types.ts). Không cast rải rác `as any` ở section component.
 */
function asJsonTyped<T>(raw: object): T {
    return raw as unknown as T;
}

/** Tra Redirect Manager (mục 17 spec CMS) — gọi khi resolveCmsPageProps trả
 * null, TRƯỚC khi trả 404. `statusCode` là enum GraphQL -> luôn về dạng TÊN
 * (vd "PERMANENT_301"), không phải số -> parse lại thành mã HTTP thật. */
export async function resolveRedirect(path: string): Promise<{ toPath: string; statusCode: 301 | 302 } | null> {
    const redirect = await RedirectService.getPublicRedirect({ fromPath: path });
    if (!redirect?.toPath) return null;
    return { toPath: redirect.toPath, statusCode: redirect.statusCode === 'TEMPORARY_302' ? 302 : 301 };
}
