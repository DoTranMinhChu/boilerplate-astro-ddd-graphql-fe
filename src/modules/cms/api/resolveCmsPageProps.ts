import { PageService } from '@/shared/services/page/page.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { RedirectService } from '@/shared/services/redirect/redirect.service';
import type { HeaderPresetDTO } from '@/shared/services/headerPreset/headerPreset.service';
import type { FooterPresetDTO } from '@/shared/services/footerPreset/footerPreset.service';
import type { FieldDefinitionDTO, SeoData, ContentEntryDTO, PageStyle, PageTranslationDTO, PageDataBinding } from '@/modules/cms/cms.types';
import { resolveGenericDataSource } from './genericDataSource';
import { resolveSeoFieldMapping } from './resolveSeoFieldMapping';
import { NodeService } from '@shared/services/node/node.service';
import { buildNodeTree } from '@/modules/cms/node/buildNodeTree';
import type { NodeTree, NodeDTO } from '@/modules/cms/node/node.types';

export interface CmsPageProps {
    seo: SeoData | undefined;
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
    header?: HeaderPresetDTO;
    footer?: FooterPresetDTO;
    /** Nền/font riêng cho TOÀN trang — xem Page.style. */
    pageStyle?: PageStyle;
    /** Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — mọi bản dịch PUBLISHED KHÁC locale trang
     * đang xem, cùng translationGroupId. Rỗng/undefined khi trang không thuộc nhóm dịch nào có
     * ≥2 thành viên PUBLISHED (vd site chưa dùng i18n, hoặc bản dịch còn Draft) — SiteHeader tự
     * ẩn bộ chuyển khi mảng rỗng, không phải lỗi. */
    availableTranslations?: PageTranslationDTO[];
    /** Path params đã resolve từ URL pattern (Phase 0 M1 Task 7) — cần để Node-tree lọc theo
     * pathParam qua CollectionRepeat.filter/genericFilters (qua resolveGenericDataSource()).
     * Rỗng object trên trang path tĩnh (không có ":param"). */
    pathParams?: Record<string, string>;
    /** Cây Node đã build sẵn (BE Task 8-14 rootNodeId/Node table + Task 12/13 tree
     * assembly) khi `page.rootNodeId` tồn tại — hệ page-building DUY NHẤT kể từ Phase 0 M3b. */
    nodeTree?: NodeTree[];
    /** Final-review fix Important #2: cùng `resolved.locale` đã dùng ở mọi query công khai
     * ContentEntry khác trong hàm này (xem comment "Critical #1 fix" ngay dưới) — CmsPageShell.astro
     * thread field này vào `NodeRenderContext.locale` để `fetchRepeatEntries` (NodeRenderer.tsx)
     * lọc đúng locale, tránh trộn lẫn entry từ mọi locale trong 1 nhóm dịch vào cùng 1 node repeat. */
    locale?: string;
}

/**
 * CHỈ điểm vào GraphQL cho toàn bộ public site — gọi từ Astro frontmatter
 * (SSR) trong index.astro / [...path].astro. Dùng đúng service (PageService/
 * ContentEntryService/ContentTypeService) như phía admin, không tự chế client
 * riêng (BaseService.queryApi đã an toàn SSR — xem core/api/graphql.ts).
 *
 * Resolve toàn bộ trong 1 lượt: page + nodeTree (Phase 0 M3b) + field definition
 * cho trang Chi tiết — public site không cần gọi GraphQL thêm lần nào ở client.
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

    // `page.rootNodeId` chỉ có giá trị trên trang đã được migration script (BE Task 9)
    // gán — trang chưa migrate (rootNodeId null) không build nodeTree.
    const nodeTree = resolved.page.rootNodeId
        ? buildNodeTree(asJsonTyped<NodeDTO[]>(await NodeService.getNodesByPage({ pageId: resolved.page.id! })))
        : undefined;

    const pathParams = (resolved.params as Record<string, string> | undefined) || {};
    const queryParams = options.queryParams || {};

    // Critical #1 fix (Task 16 review, mục A đọc XUÔI): `resolved.locale` — locale ĐÃ RESOLVE của
    // request hiện tại (Task 14/15) — PHẢI truyền xuống mọi query công khai đọc ContentEntry, nếu
    // không entry của MỌI locale trong 1 nhóm dịch (vd sau khi dùng "+ Thêm bản dịch") sẽ trộn
    // lẫn vào cùng 1 khối, và bản dịch mới hơn có thể "thắng" bản đúng locale của trang đang xem
    // (BE mặc định ORDER BY createdAt DESC khi không được lọc theo locale).
    const locale = resolved.locale as string | undefined;

    // Phase 0 M3b: `pageEntry` đọc thẳng `Page.dataBinding` (đã tồn tại từ M1, backfill từ M2a —
    // xem scripts/backfillPageDataBinding.ts phía BE) — DUY NHẤT nguồn xác định pageEntry của
    // trang Chi tiết kể từ khi Section bị xoá hẳn (giữ nguyên hành vi 404 khi có dataBinding
    // nhưng không tìm thấy entry).
    //
    // `resolved.entry` là DI SẢN của cơ chế page-level COLLECTION_DETAIL (đã xoá hẳn ở mục γ, BE
    // không còn set field này) — giữ nhánh đọc nó để không phá tương thích, thực tế luôn undefined.
    let pageEntry: ContentEntryDTO | undefined = resolved.entry ? asJsonTyped<ContentEntryDTO>(resolved.entry) : undefined;
    const dataBinding = resolved.page.dataBinding ? asJsonTyped<PageDataBinding>(resolved.page.dataBinding as unknown as object) : undefined;
    const hasDetailBinding = dataBinding?.mode === 'detail' && !!dataBinding.contentTypeId && !!dataBinding.genericFilters?.length;
    if (!pageEntry && hasDetailBinding) {
        const filters = resolveGenericDataSource(dataBinding!.genericFilters!, { pathParams, queryParams });
        // Final whole-branch review fix Critical #1: `resolveGenericDataSource` ÂM THẦM bỏ qua 1
        // filter không resolve được giá trị (vd valueSource='pathParam' nhưng URL hiện tại không
        // có param đó) — nếu MỌI filter đều bị bỏ, gửi 1 query KHÔNG filter nào sẽ "trúng số" 1
        // entry tuỳ ý của content type đó thay vì đúng nghĩa "không xác định được bản ghi nào" —
        // đúng lớp lỗi I3/I5 đã cảnh giác từ lâu. Phải chặn TRƯỚC khi query, không để `filters:
        // undefined` lọt xuống getPublicContentEntries.
        if (!filters.length) return null;
        const entries = await ContentEntryService.getPublicContentEntries({
            contentTypeId: dataBinding!.contentTypeId!,
            filters,
            limit: 1,
            locale,
        });
        const found = (entries ?? []).filter((e) => e != null)[0];
        // Trang có dataBinding kiểu 'detail' nhưng KHÔNG tìm thấy entry nào khớp -> coi như
        // trang không tồn tại (404) — giữ đúng hành vi cũ.
        if (!found) return null;
        pageEntry = asJsonTyped<ContentEntryDTO>(found);
    }

    // ContentDetailSection dựa HOÀN TOÀN vào contentTypeFields để biết field nào là hero/title/body
    // (xem allFields() của nó) — thiếu nó thì block render RỖNG dù pageEntry có dữ liệu thật (bug im
    // lặng: không lỗi console, không 404, chỉ trống layout). Nguồn content type nay LUÔN là
    // `pageEntry.contentTypeId` (có sẵn trên mọi ContentEntry, do Block CONTENT_DETAIL nạp) — điều kiện
    // cũ `resolved.page.pageType === 'COLLECTION_DETAIL'` đã bỏ cùng enum ở mục γ.
    let contentTypeFields: FieldDefinitionDTO[] | undefined;
    const contentTypeIdForFields = pageEntry?.contentTypeId;
    if (contentTypeIdForFields) {
        const contentType = await ContentTypeService.getOneContentType({ id: contentTypeIdForFields });
        contentTypeFields = filterDefined(contentType?.fields);
    }

    // Mục δ: `resolved.seo` (BE `resolvePage`) LUÔN là `page.seo` tĩnh kể từ γ Task 4 (không
    // còn khái niệm "entry.seo thắng" — đã xoá hẳn cùng COLLECTION_DETAIL). Nguồn động DUY NHẤT
    // giờ là `page.seoFieldMapping` (Task 1) map vào field của `pageEntry` (đã tính xong ở trên).
    // Không có pageEntry (trang tĩnh) -> resolveSeoFieldMapping tự fallback nguyên page.seo.
    const seo = resolveSeoFieldMapping(
        resolved.page.seo,
        resolved.page.seoFieldMapping as Record<string, string> | undefined,
        pageEntry?.data as Record<string, unknown> | undefined,
    );
    const header = resolved.header ? asJsonTyped<HeaderPresetDTO>(resolved.header) : undefined;
    const footer = resolved.footer ? asJsonTyped<FooterPresetDTO>(resolved.footer) : undefined;
    const pageStyle = resolved.page.style ? asJsonTyped<PageStyle>(resolved.page.style as unknown as object) : undefined;
    // Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — mọi bản dịch PUBLISHED khác locale đang xem,
    // cùng translationGroupId. `resolved.locale` là locale ĐÃ RESOLVE của request hiện tại (BE
    // PageResolverResultType.locale, Task 14) — loại đúng bản đang xem khỏi kết quả, FE không cần
    // lọc lại. KHÔNG dùng `getAllPage` (yêu cầu STAFF_ROLES, không gọi được từ SSR public không
    // JWT) — xem PageResolver.getPageTranslations (BE mới, Task 15).
    const translationGroupId = resolved.page.translationGroupId as string | undefined;
    // Final-review fix Important (Phase 0 M3b): `relationDisplay`/`taxonomyDisplay` (join field
    // RELATION/TAXONOMY của pageEntry -> tên hiển thị thật, thay vì raw id) từng được tính ở
    // đây và đọc bởi `ContentDetailSection.tsx` qua `<SectionRenderer>`. `SectionRenderer` đã bị
    // xoá hẳn ở milestone này, và `ContentDetailNode.tsx` (Node-tree, kế thừa) CHƯA có channel
    // tương ứng trong `NodeRenderContext` (xem comment đầu ContentDetailNode.tsx) — nghĩa là 2
    // field này KHÔNG còn consumer nào, nhưng vẫn âm thầm tốn N query GraphQL thật mỗi lần SSR
    // trang Chi tiết (getPublicContentEntries/getOneContentType/getPublicDetailPathByContentType
    // mỗi field RELATION + getAllTerm(limit:500) mỗi taxonomy) rồi vứt kết quả đi. Xoá hẳn việc
    // tính toán ở đây (không port sang ContentDetailNode) — port tính năng "join" thật vào
    // Node-tree là backlog đã được chấp nhận riêng từ M2b ("ContentDetailNode vẫn bỏ
    // relationDisplay/taxonomyDisplay — chấp nhận được ở M2b, chưa sửa"), không thuộc phạm vi
    // milestone "xoá Section" này.
    const availableTranslations = translationGroupId
        ? await PageService.getPageTranslations({ translationGroupId, excludeLocale: resolved.locale })
        : ([] as PageTranslationDTO[]);

    return { seo, pageEntry, contentTypeFields, header, footer, pageStyle, availableTranslations, nodeTree, locale, pathParams };
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
