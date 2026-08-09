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

    const allSections = filterDefined(resolved.sections)
        .map(asJsonTyped<SectionDTO>)
        .filter((s) => s.enabled)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Giai đoạn 1 (mục 3.0 design 2026-08-09-block-driven-content-binding-design.md, PHÁT HIỆN Ở RÀ SOÁT
    // CUỐI β — KHÔNG được bỏ qua bước này dù có vẻ chỉ là tối ưu): resolve TRƯỚC các section CONTENT_DETAIL
    // đã cấu hình đầy đủ (dataSource.mode==='detail', ĐÚNG các guard CRITICAL fix commit 6013618 — giữ
    // NGUYÊN VẸN, không nới lỏng/xoá điều kiện nào: section.type===CONTENT_DETAIL + có contentTypeId + có
    // genericFilters không rỗng) — vì RELATED_ENTRIES/BACKLINK_ENTRIES ở giai đoạn 2 CẦN biết pageEntry.id
    // TRƯỚC khi resolve, không thể tính pageEntry SAU khi mọi section đã resolve song song như code cũ (đó
    // chính là bug I3/I5 rà soát cuối β tìm ra: trên trang không có resolved.entry page-level, RELATED_ENTRIES
    // luôn nhận currentEntryId=undefined).
    const detailCandidates = allSections.filter((s) =>
        s.type === ESectionType.CONTENT_DETAIL
        && s.dataSource?.mode === 'detail'
        && !!s.dataSource?.query?.contentTypeId
        && !!s.dataSource?.genericFilters?.length);
    const resolvedDetailSections = await Promise.all(
        detailCandidates.map((s) => resolveSectionDataSource(s, resolved.entry?.id, pathParams, queryParams)),
    );

    // pageEntry: ưu tiên resolved.entry — cơ chế CŨ, page-level COLLECTION_DETAIL match (BE
    // page.resolver.ts's matchCollectionDetail, KHÔNG đụng trong plan này) — nếu có, dùng luôn (trang
    // COLLECTION_DETAIL hiện có không bị ảnh hưởng). Nếu KHÔNG có, lấy entry của section CONTENT_DETAIL
    // ĐẦU TIÊN (theo order) đã resolve được ở giai đoạn 1. Trang CÓ ít nhất 1 candidate nhưng KHÔNG candidate
    // nào tìm thấy gì → coi như trang không tồn tại (404), trả null SỚM ở đây, không sang giai đoạn 2 (giữ
    // nguyên đúng hành vi β: không cần resolve phần còn lại của 1 trang sắp 404, và [...path].astro đã xử lý
    // null -> 404 sẵn).
    let pageEntry: ContentEntryDTO | undefined = resolved.entry ? asJsonTyped<ContentEntryDTO>(resolved.entry) : undefined;
    if (!pageEntry && resolvedDetailSections.length) {
        const found = resolvedDetailSections.find((s) => s.entries?.length);
        if (!found) return null;
        pageEntry = found.entries![0];
    }

    // Giai đoạn 2: mọi section KHÁC (không phải section CONTENT_DETAIL đã resolve ở giai đoạn 1 — tránh gọi
    // lại) — LẦN NÀY truyền pageEntry?.id (đã biết) làm currentEntryId, để RELATED_ENTRIES/BACKLINK_ENTRIES
    // hoạt động đúng dù pageEntry đến từ resolved.entry (COLLECTION_DETAIL cũ) hay từ 1 block CONTENT_DETAIL
    // (β) — trước khi sửa, các block này luôn nhận resolved.entry?.id (thường undefined trên trang kiểu β).
    const detailCandidateIds = new Set(detailCandidates.map((s) => s.id));
    const remainingSections = allSections.filter((s) => !detailCandidateIds.has(s.id));
    const resolvedRemaining = await Promise.all(
        remainingSections.map((s) => resolveSectionDataSource(s, pageEntry?.id, pathParams, queryParams)),
    );

    // Ghép lại ĐÚNG THỨ TỰ order gốc (2 mảng trên không còn giữ thứ tự xen kẽ ban đầu vì đã tách nhóm).
    const resolvedById = new Map([...resolvedDetailSections, ...resolvedRemaining].map((s) => [s.id, s]));
    const sections = allSections.map((s) => resolvedById.get(s.id)!);

    // (Phát hiện lúc QA UI thật Task 2, không có trong brief Task 1 gốc — xem task-2-report.md
    // "Sai khác so với brief"): điều kiện CŨ chỉ fetch contentTypeFields cho trang COLLECTION_DETAIL
    // (cơ chế page-level cũ) — 1 trang STATIC_MODULAR có block 'detail' (mục β) có `pageEntry` đúng
    // (nhánh fallback phía trên) nhưng KHÔNG BAO GIỜ có contentTypeFields, khiến ContentDetailSection
    // (dựa hoàn toàn vào contentTypeFields để biết field nào là hero/title/body — xem allFields() của
    // nó) render RỖNG dù pageEntry có dữ liệu thật — bug im lặng, không lỗi console, không 404, chỉ
    // trống layout. `pageEntry.contentTypeId` (có sẵn trên mọi ContentEntry) thay cho
    // `resolved.page.contentTypeId` khi không phải COLLECTION_DETAIL — hành vi COLLECTION_DETAIL cũ
    // giữ NGUYÊN 100% (nhánh đầu vẫn ưu tiên resolved.page.contentTypeId y hệt trước).
    let contentTypeFields: FieldDefinitionDTO[] | undefined;
    const contentTypeIdForFields = resolved.page.pageType === 'COLLECTION_DETAIL'
        ? resolved.page.contentTypeId
        : pageEntry?.contentTypeId;
    if (contentTypeIdForFields) {
        const contentType = await ContentTypeService.getOneContentType({ id: contentTypeIdForFields });
        contentTypeFields = filterDefined(contentType?.fields);
    }

    const hasResultSeo = !!resolved.seo && Object.values(resolved.seo).some((v) => v !== undefined && v !== null);
    const seo: SeoData | undefined = hasResultSeo ? resolved.seo : resolved.page.seo;
    const header = resolved.header ? asJsonTyped<HeaderPresetDTO>(resolved.header) : undefined;
    const footer = resolved.footer ? asJsonTyped<FooterPresetDTO>(resolved.footer) : undefined;
    const pageStyle = resolved.page.style ? asJsonTyped<PageStyle>(resolved.page.style as unknown as object) : undefined;
    const [relationDisplay, taxonomyDisplay] = pageEntry && contentTypeFields
        ? await Promise.all([
            resolveRelationDisplays(contentTypeFields, pageEntry.data || {}),
            resolveTaxonomyDisplays(contentTypeFields, pageEntry.data || {}),
        ])
        : [undefined, undefined];

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
    const result: Record<string, TaxonomyDisplayItem[]> = {};

    // Lọc theo entry THỰC SỰ có giá trị trước khi tính taxonomyId cần fetch — tránh
    // query getAllTerm(limit:500) vô ích trên mỗi lần SSR trang chi tiết khi field
    // TAXONOMY khai báo trên content type nhưng entry cụ thể để trống (cùng nguyên tắc
    // "if (!ids.length) return" mà resolveRelationDisplays đã áp dụng per-field).
    const fieldsWithIds = fields
        .filter((f): f is FieldDefinitionDTO & { key: string; taxonomyId: string } => f.type === 'TAXONOMY' && !!f.key && !!f.taxonomyId)
        .map((field) => {
            const raw = data[field.key];
            const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v): v is string => typeof v === 'string' && !!v);
            return { field, ids };
        })
        .filter((f): f is { field: FieldDefinitionDTO & { key: string; taxonomyId: string }; ids: string[] } => f.ids.length > 0);
    if (!fieldsWithIds.length) return result;

    const uniqueTaxonomyIds = [...new Set(fieldsWithIds.map((f) => f.field.taxonomyId))];
    const termsByTaxonomy = new Map<string, TermDTO[]>();
    await Promise.all(uniqueTaxonomyIds.map(async (taxonomyId) => {
        const res = await TermService.getAllTerm({ input: { filter: { taxonomyId } as unknown as string, limit: 500 } });
        const edges = (res?.edges || []) as Edge<TermDTO>[];
        termsByTaxonomy.set(taxonomyId, edges.filter((e): e is Edge<TermDTO> & { node: TermDTO } => !!e.node).map((e) => e.node));
    }));

    fieldsWithIds.forEach(({ field, ids }) => {
        const byId = new Map((termsByTaxonomy.get(field.taxonomyId) || []).map((term) => [term.id, term]));
        // Bỏ qua id không tra được (term đã bị xoá, hoặc vượt quá limit:500) thay vì fallback
        // hiện UUID thô ra trang công khai — đúng hành vi resolveRelationDisplays đã có (entry
        // bị xoá tự biến mất khỏi danh sách chip, không hiện id thay tên).
        result[field.key] = ids
            .map((id) => ({ id, label: byId.get(id)?.label }))
            .filter((item): item is { id: string; label: string } => !!item.label);
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
    if (ds.mode === 'detail') {
        // Chế độ "1 bản ghi" (mục β design 2026-08-09-block-driven-content-binding-design.md) — dùng LẠI
        // nguyên genericFilters (AND-only, đã có static/pathParam/queryParam) nhưng luôn limit 1, ý nghĩa
        // "đây là bản ghi DUY NHẤT lý do trang này tồn tại" — không tìm thấy sẽ làm CẢ TRANG 404 (xử lý ở
        // resolveCmsPageProps(), không phải ở đây — hàm này chỉ trả về entries rỗng/1 phần tử).
        //
        // 2 GUARD BẮT BUỘC, phát hiện ở rà soát cuối plan β (CRITICAL C1 + IMPORTANT I2/I4):
        // - `section.type === CONTENT_DETAIL`: chặn 1 field `dataSource.mode` "lạc" (vd do gõ tay qua Raw
        //   JSON, hoặc do sao chép cấu hình giữa các loại khối) vô tình biến 1 khối DANH SÁCH (CONTENT_GRID/
        //   FEATURED_ENTRY...) thành "cổng 404 cả trang" -- các loại khối đó chỉ nên bị ép limit 1 khi CHÍNH
        //   NÓ là khối Chi tiết, không phải bất kỳ khối nào tình cờ mang mode='detail'.
        // - `ds.genericFilters?.length`: 1 khối Chi tiết CHƯA cấu hình điều kiện lọc nào (vd vừa kéo vào
        //   trang, admin chưa kịp chọn gì) không nên được coi là "đã cấu hình xong" -- nếu không chặn ở đây,
        //   (a) query chạy KHÔNG filter nào sẽ khớp BẤT KỲ entry nào của content type đó (mọi URL đều 200,
        //   luôn trả về 1 bản ghi tuỳ ý — sai hẳn tinh thần "đúng 1 bản ghi xác định"), và (b) tệ hơn: 1 khối
        //   Chi tiết MỚI THÊM VÀO, autosave field dataSource.mode ẩn chạy ngay lúc mount (xem comment
        //   generateForm.tsx dòng ~243-250) TRƯỚC KHI admin kịp chọn Content Type — nếu vẫn coi là "cổng
        //   404 hợp lệ", trang sập NGAY LẬP TỨC chỉ vì admin thao tác kéo-thả 1 khối, chưa cấu hình gì.
        //   Coi 1 khối chưa có filter là "chưa cấu hình xong" -- rơi về `return section` cuối hàm, không
        //   query, không phải cổng 404 -- khớp đúng ý nghĩa "block trong lúc admin đang soạn dở".
        if (section.type !== ESectionType.CONTENT_DETAIL || !ds.genericFilters?.length) {
            return section;
        }
        const resolvedFilters = resolveGenericDataSource(ds.genericFilters, { pathParams, queryParams });
        // KHÔNG chạy query "không filter nào" (khác nhánh 'dynamic' phía trên, nơi "không filter = danh sách
        // tĩnh" hợp lý cho 1 DANH SÁCH) — với "đúng 1 bản ghi", 1 filter đã cấu hình nhưng KHÔNG resolve
        // được giá trị nào ở request hiện tại (vd điều kiện đọc pathParam nhưng trang không có param đó lúc
        // này) nghĩa là "không xác định được bản ghi nào", phải coi như KHÔNG TÌM THẤY (entries rỗng) — nếu
        // chạy query không filter, sẽ khớp bất kỳ entry nào của content type đó (đúng lỗi I4 rà soát cuối
        // phát hiện), khiến mọi URL đều trả về "trúng số" 1 bản ghi tuỳ ý thay vì phải là ĐÚNG 1 bản ghi xác
        // định.
        if (!resolvedFilters.length) {
            return { ...section, entries: [], detailPathPattern };
        }
        const entries = await ContentEntryService.getPublicContentEntries({
            contentTypeId,
            limit: 1,
            filters: resolvedFilters,
        });
        const entry = filterDefined(entries).map(asJsonTyped<ContentEntryDTO>)[0];
        return { ...section, entries: entry ? [entry] : [], detailPathPattern };
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
