import { PageService } from '@/shared/services/page/page.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { RedirectService } from '@/shared/services/redirect/redirect.service';
import { TermService, type TermDTO } from '@/shared/services/term/term.service';
import { ESectionType } from '@/modules/cms/cms.constants';
import type { HeaderPresetDTO } from '@/shared/services/headerPreset/headerPreset.service';
import type { FooterPresetDTO } from '@/shared/services/footerPreset/footerPreset.service';
import type { ResolvedSection, ResolvedMixedEntry, RelationDisplayItem, TaxonomyDisplayItem, SectionDTO, FieldDefinitionDTO, SeoData, ContentEntryDTO, PageStyle } from '@/modules/cms/cms.types';
import type { Edge } from '@core/api/types';
import { resolveGenericDataSource } from './genericDataSource';

export interface CmsPageProps {
    seo: SeoData | undefined;
    sections: ResolvedSection[];
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
    header?: HeaderPresetDTO;
    footer?: FooterPresetDTO;
    /** Nền/font riêng cho TOÀN trang (khác style riêng từng Section) — xem Page.style. */
    pageStyle?: PageStyle;
    /** Field RELATION của `pageEntry` đã "join" xong thành tên hiển thị thật + link —
     * key = field key (vd "danhMucId"). Chỉ có trên trang Chi tiết. */
    relationDisplay?: Record<string, RelationDisplayItem[]>;
    /** Field TAXONOMY của `pageEntry` đã "join" xong thành nhãn Term thật (không phải raw
     * id) — key = field key. Chỉ có trên trang Chi tiết, đúng khuôn `relationDisplay`. */
    taxonomyDisplay?: Record<string, TaxonomyDisplayItem[]>;
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
export async function resolveCmsPageProps(path: string, options: { preview?: boolean; queryParams?: Record<string, string> } = {}): Promise<CmsPageProps | null> {
    const resolved = options.preview
        ? await PageService.previewPageResolver({ path })
        : await PageService.pageResolver({ path });
    if (!resolved?.page) return null;

    const pathParams = (resolved.params as Record<string, string> | undefined) || {};
    const queryParams = options.queryParams || {};

    const sections = await Promise.all(
        filterDefined(resolved.sections)
            .map(asJsonTyped<SectionDTO>)
            .filter((s) => s.enabled)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s) => resolveSectionDataSource(s, resolved.entry?.id, pathParams, queryParams)),
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
    const pageStyle = resolved.page.style ? asJsonTyped<PageStyle>(resolved.page.style as unknown as object) : undefined;
    const relationDisplay = pageEntry && contentTypeFields ? await resolveRelationDisplays(contentTypeFields, pageEntry.data || {}) : undefined;
    const taxonomyDisplay = pageEntry && contentTypeFields ? await resolveTaxonomyDisplays(contentTypeFields, pageEntry.data || {}) : undefined;

    return { seo, sections, pageEntry, contentTypeFields, header, footer, pageStyle, relationDisplay, taxonomyDisplay };
}

/**
 * "Join" field RELATION → tên hiển thị thật + link, thay vì admin/khách thấy raw
 * UUID (bug thật đã phát hiện: trang Chi tiết bài viết hiện thẳng id của Danh mục).
 * Tên lấy theo field đánh dấu isSlugSource của content type ĐÍCH (cùng logic tiêu đề
 * ContentDetailSection dùng), rơi về slug nếu content type đích không có field nào
 * đánh dấu. Link chỉ có khi content type đích đã publish 1 trang Chi tiết.
 */
async function resolveRelationDisplays(fields: FieldDefinitionDTO[], data: Record<string, unknown>): Promise<Record<string, RelationDisplayItem[]>> {
    const relationFields = fields.filter((f): f is FieldDefinitionDTO & { key: string; relationTarget: string } => f.type === 'RELATION' && !!f.key && !!f.relationTarget);
    const result: Record<string, RelationDisplayItem[]> = {};

    await Promise.all(relationFields.map(async (field) => {
        const raw = data[field.key];
        const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v): v is string => typeof v === 'string' && !!v);
        if (!ids.length) return;

        const [entries, targetType, detailPathPattern] = await Promise.all([
            ContentEntryService.getPublicContentEntries({ contentTypeId: field.relationTarget, ids }),
            ContentTypeService.getOneContentType({ id: field.relationTarget }),
            PageService.getPublicDetailPathByContentType({ contentTypeId: field.relationTarget }),
        ]);
        const targetFields = filterDefined(targetType?.fields);
        // "Hiển thị theo field" đã cấu hình (field.relationDisplayField) thắng, rơi về
        // field đánh dấu isSlugSource, rồi field TEXT đầu tiên, rồi slug (xem thiết kế mục C).
        const titleField = (field.relationDisplayField ? targetFields.find((f) => f.key === field.relationDisplayField) : undefined)
            ?? targetFields.find((f) => f.isSlugSource)
            ?? targetFields.find((f) => f.type === 'TEXT');

        result[field.key] = filterDefined(entries).map((e) => {
            const entryData = (e.data as unknown as Record<string, unknown> | undefined) || {};
            const label = (titleField?.key ? entryData[titleField.key] : undefined) || e.slug || e.id;
            return {
                id: e.id!,
                label: String(label),
                href: detailPathPattern && e.slug ? detailPathPattern.replace(':slug', e.slug) : undefined,
            };
        });
    }));

    return result;
}

/**
 * "Join" field TAXONOMY → nhãn Term thật, đúng khuôn `resolveRelationDisplays` nhưng
 * lookup Term (getAllTerm theo taxonomyId, rồi tra id ở client) thay vì ContentEntry —
 * Term không có trang riêng nên không có `href` như RelationDisplayItem. 1 Taxonomy có
 * thể được nhiều field TAXONOMY khác nhau tham chiếu (vd 2 field cùng trỏ "Danh mục") —
 * fetch getAllTerm ĐÚNG 1 LẦN mỗi taxonomyId, không phải mỗi field.
 */
async function resolveTaxonomyDisplays(fields: FieldDefinitionDTO[], data: Record<string, unknown>): Promise<Record<string, TaxonomyDisplayItem[]>> {
    const taxonomyFields = fields.filter((f): f is FieldDefinitionDTO & { key: string; taxonomyId: string } => f.type === 'TAXONOMY' && !!f.key && !!f.taxonomyId);
    const result: Record<string, TaxonomyDisplayItem[]> = {};
    if (!taxonomyFields.length) return result;

    const uniqueTaxonomyIds = [...new Set(taxonomyFields.map((f) => f.taxonomyId))];
    const termsByTaxonomy = new Map<string, TermDTO[]>();
    await Promise.all(uniqueTaxonomyIds.map(async (taxonomyId) => {
        const res = await TermService.getAllTerm({ input: { filter: { taxonomyId } as unknown as string, limit: 500 } });
        const edges = (res?.edges || []) as Edge<TermDTO>[];
        termsByTaxonomy.set(taxonomyId, edges.filter((e): e is Edge<TermDTO> & { node: TermDTO } => !!e.node).map((e) => e.node));
    }));

    taxonomyFields.forEach((field) => {
        const raw = data[field.key];
        const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v): v is string => typeof v === 'string' && !!v);
        if (!ids.length) return;
        const byId = new Map((termsByTaxonomy.get(field.taxonomyId) || []).map((term) => [term.id, term]));
        result[field.key] = ids.map((id) => ({ id, label: byId.get(id)?.label || id }));
    });

    return result;
}

/** Fill `entries`/`detailPathPattern` cho 1 section nếu nó khai báo dataSource
 * (manual hoặc dynamic) — xem mục 9 spec CMS. Section không cần data source
 * (Hero/CTA...) trả về nguyên trạng. Exported so the Page Builder canvas (which
 * edits sections locally, outside the full page resolve) can stay WYSIWYG for
 * content-grid blocks without duplicating this logic. */
export async function resolveSectionDataSource(
    section: SectionDTO,
    currentEntryId?: string,
    pathParams: Record<string, string> = {},
    queryParams: Record<string, string> = {},
): Promise<ResolvedSection> {
    // RELATED_ENTRIES chỉ có nghĩa trên trang Chi tiết (cần biết đang xem entry nào để
    // tìm entry "liên quan") — Page Builder xem cấu trúc/hiệu ứng với dữ liệu giả không
    // có entry thật, bỏ qua an toàn (không lỗi, chỉ đơn giản chưa có gì để hiện).
    if (section.type === ESectionType.RELATED_ENTRIES) {
        if (!currentEntryId) return section;
        const entries = filterDefined(
            await ContentEntryService.getRelatedContentEntries({
                input: { entryId: currentEntryId, matchField: section.dataSource?.matchField, limit: section.dataSource?.limit },
            }),
        ).map(asJsonTyped<ContentEntryDTO>);
        const contentTypeId = entries[0]?.contentTypeId;
        const detailPathPattern = contentTypeId ? await PageService.getPublicDetailPathByContentType({ contentTypeId }) : undefined;
        return { ...section, entries, detailPathPattern };
    }

    // BACKLINK_ENTRIES — hướng NGƯỢC với RELATED_ENTRIES: hiện entries ở content type
    // KHÁC đang trỏ RELATION về entry đang xem (vd trang Chi tiết danh mục hiện các
    // bài viết thuộc danh mục đó). Cũng chỉ có nghĩa trên trang Chi tiết.
    if (section.type === ESectionType.BACKLINK_ENTRIES) {
        const sourceContentTypeId = section.dataSource?.sourceContentTypeId;
        const matchField = section.dataSource?.matchField;
        if (!currentEntryId || !sourceContentTypeId || !matchField) return section;
        const entries = filterDefined(
            await ContentEntryService.getBacklinkContentEntries({
                input: { entryId: currentEntryId, sourceContentTypeId, matchField, limit: section.dataSource?.limit },
            }),
        ).map(asJsonTyped<ContentEntryDTO>);
        const detailPathPattern = await PageService.getPublicDetailPathByContentType({ contentTypeId: sourceContentTypeId });
        return { ...section, entries, detailPathPattern };
    }

    if (section.type === ESectionType.MIXED_FEED) {
        const sources = section.dataSource?.sources || [];
        if (!sources.length) return section;
        const entries = filterDefined(
            await ContentEntryService.getMixedContentEntries({
                input: { sources: sources.map((s) => ({ contentTypeId: s.contentTypeId, limit: s.limit })), limit: section.dataSource?.limit },
            }),
        ).map(asJsonTyped<ContentEntryDTO>);

        // Mỗi content type góp mặt trong feed có trang Chi tiết publish khác nhau —
        // resolve path pattern riêng cho từng loại, không dùng chung 1 pattern.
        const uniqueContentTypeIds = [...new Set(entries.map((e) => e.contentTypeId).filter((id): id is string => !!id))];
        const patterns = await Promise.all(uniqueContentTypeIds.map((id) => PageService.getPublicDetailPathByContentType({ contentTypeId: id })));
        const patternByType = new Map(uniqueContentTypeIds.map((id, i) => [id, patterns[i]]));
        const sourceByType = new Map(sources.map((s) => [s.contentTypeId, s]));

        const mixedEntries: ResolvedMixedEntry[] = entries.map((entry) => ({
            entry,
            contentTypeId: entry.contentTypeId!,
            fieldMapping: sourceByType.get(entry.contentTypeId!)?.fieldMapping || {},
            detailPathPattern: patternByType.get(entry.contentTypeId!),
        }));
        return { ...section, mixedEntries };
    }

    const ds = section.dataSource;
    const contentTypeId = ds?.query?.contentTypeId;
    if (!ds?.mode || !contentTypeId) return section;

    const detailPathPattern = await PageService.getPublicDetailPathByContentType({ contentTypeId });

    if (ds.mode === 'manual' && ds.ids?.length) {
        const entries = await ContentEntryService.getPublicContentEntries({ contentTypeId, ids: ds.ids });
        return { ...section, entries: filterDefined(entries).map(asJsonTyped<ContentEntryDTO>), detailPathPattern };
    }
    if (ds.mode === 'dynamic') {
        // GenericDataSourceConfig pilot (mục 3/5 design) — nếu block cấu hình
        // genericFilters, biến path/query param của trang hiện tại thành filter cụ
        // thể; nếu không có filter nào (kể cả rỗng vì trang thiếu param cần), rơi về
        // hành vi TĨNH cũ (chỉ contentTypeId/limit/sort) — không phá bất kỳ block nào
        // đã cấu hình trước khi tính năng này tồn tại.
        const resolvedFilters = resolveGenericDataSource(ds.genericFilters || [], { pathParams, queryParams });
        const entries = await ContentEntryService.getPublicContentEntries({
            contentTypeId,
            limit: ds.query?.limit,
            sortField: ds.query?.sort?.field,
            sortDirection: ds.query?.sort?.direction,
            filters: resolvedFilters.length ? resolvedFilters : undefined,
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
