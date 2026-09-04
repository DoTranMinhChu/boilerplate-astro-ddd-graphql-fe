import { PageService } from '@/shared/services/page/page.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { RedirectService } from '@/shared/services/redirect/redirect.service';
import type { HeaderPresetDTO } from '@/shared/services/headerPreset/headerPreset.service';
import type { FooterPresetDTO } from '@/shared/services/footerPreset/footerPreset.service';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';
import type { FieldDefinitionDTO, SeoData, ContentEntryDTO, PageStyle, PageTranslationDTO } from '@/modules/cms/cms.types';
import { resolveSeoFieldMapping } from './resolveSeoFieldMapping';
import { NodeService } from '@shared/services/node/node.service';
import { buildNodeTree } from '@/modules/cms/node/buildNodeTree';
import { fetchRepeatEntries } from '@/modules/cms/node/nodeDataBinding';
import type { NodeTree, NodeDTO } from '@/modules/cms/node/node.types';
import { ERepeatCardinality, ERepeatOnNotFound } from '@/modules/cms/node/node.types';

export interface CmsPageProps {
    seo: SeoData | undefined;
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
    header?: HeaderPresetDTO;
    footer?: FooterPresetDTO;
    /** Theme layer / style pipeline (Task 9) — theme đã resolve của trang (Page.themeId thắng,
     * rơi về theme isDefault=true — xem PageResolver.resolveTheme phía BE, Task 5/6).
     * CmsPageShell.astro dùng nó qua `resolveThemeCssVars` để bơm CSS custom property + Google
     * Fonts vào <body>/<head>. */
    theme?: ThemeDTO;
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
    /** Node-level data binding (2026-08-17) — every `cardinality:'one'` node's resolved entries,
     * keyed by node id, pre-fetched below during the 404 check so NodeChildrenList/TableNode/
     * CardListNode don't re-fetch a node already resolved here. See
     * NodeRenderContext.prefetchedRepeatEntries's doc comment (node.types.ts). */
    prefetchedRepeatEntries?: Map<string, Record<string, any>[]>;
}

/** Depth-first walk collecting every node with a `cardinality:'one'` repeat, in document order
 * — used both for the pre-render 404 check and to find "the page's canonical entry" for SEO
 * field mapping (design doc §4: "first node found, document order"). */
function findSingleEntryNodes(nodes: NodeTree[]): NodeTree[] {
    const found: NodeTree[] = [];
    const visit = (list: NodeTree[]) => {
        for (const node of list) {
            if (node.repeat?.cardinality === ERepeatCardinality.ONE) found.push(node);
            if (node.children?.length) visit(node.children);
        }
    };
    visit(nodes);
    return found;
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

    // Mục δ (Phase 3 mục 3, Task 15): `translationGroupId` chỉ phụ thuộc `resolved.page`, sẵn
    // có ngay sau bước resolve gốc — tính trước để đủ điều kiện gọi song song với node-tree
    // fetch bên dưới (Task 12).
    const translationGroupId = resolved.page.translationGroupId as string | undefined;

    // Task 12 (Group 3 mục 3.9): node-tree fetch (`NodeService.getNodesByPage`) và translations
    // fetch (`PageService.getPageTranslations`) chỉ phụ thuộc `resolved` (bước resolve gốc ở
    // trên) — KHÔNG phụ thuộc lẫn nhau — nên gộp vào 1 `Promise.all` thay vì chạy tuần tự (bản
    // cũ: node-tree trước, translations chạy cuối hàm dù không cần chờ gì ở giữa). Điều kiện
    // "không cần gọi" của mỗi nhánh (rootNodeId null / không có translationGroupId) được giữ
    // nguyên bằng cách resolve thẳng giá trị mặc định thay vì gọi service.
    const [rawNodes, availableTranslations] = await Promise.all([
        resolved.page.rootNodeId
            // `page.rootNodeId` chỉ có giá trị trên trang đã được migration script (BE Task 9)
            // gán — trang chưa migrate (rootNodeId null) không build nodeTree.
            ? NodeService.getNodesByPage({ pageId: resolved.page.id! })
            : Promise.resolve(undefined),
        translationGroupId
            // Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — mọi bản dịch PUBLISHED khác locale
            // đang xem, cùng translationGroupId. `resolved.locale` là locale ĐÃ RESOLVE của
            // request hiện tại (BE PageResolverResultType.locale, Task 14) — loại đúng bản đang
            // xem khỏi kết quả, FE không cần lọc lại. KHÔNG dùng `getAllPage` (yêu cầu
            // STAFF_ROLES, không gọi được từ SSR public không JWT) — xem
            // PageResolver.getPageTranslations (BE mới, Task 15).
            ? PageService.getPageTranslations({ translationGroupId, excludeLocale: resolved.locale })
            : Promise.resolve([] as PageTranslationDTO[]),
    ]);
    const nodeTree = rawNodes ? buildNodeTree(asJsonTyped<NodeDTO[]>(rawNodes)) : undefined;

    const pathParams = (resolved.params as Record<string, string> | undefined) || {};
    const queryParams = options.queryParams || {};

    // Critical #1 fix (Task 16 review, mục A đọc XUÔI): `resolved.locale` — locale ĐÃ RESOLVE của
    // request hiện tại (Task 14/15) — PHẢI truyền xuống mọi query công khai đọc ContentEntry, nếu
    // không entry của MỌI locale trong 1 nhóm dịch (vd sau khi dùng "+ Thêm bản dịch") sẽ trộn
    // lẫn vào cùng 1 khối, và bản dịch mới hơn có thể "thắng" bản đúng locale của trang đang xem
    // (BE mặc định ORDER BY createdAt DESC khi không được lọc theo locale).
    const locale = resolved.locale as string | undefined;

    // Node-level data binding (2026-08-17, replaces Page.dataBinding — see design doc
    // docs/superpowers/specs/2026-08-17-node-data-binding-design.md §4): every `cardinality:'one'`
    // node in the tree is pre-fetched here, BEFORE the tree renders, so an `onNotFound:'404'` node
    // can turn into a real HTTP 404 (a body that just happens to render empty is NOT the same
    // thing — the caller needs `null` back to set the actual status code). Results are threaded
    // down via `prefetchedRepeatEntries` so NodeChildrenList/TableNode/CardListNode don't
    // re-fetch a node already resolved here. `Page.dataBinding`/`contentTypeId` are no longer
    // read anywhere in this function (DB columns kept, unread — see design doc §6).
    //
    // Task 12 (Group 3 mục 3.9): mỗi node fetch KHÔNG phụ thuộc node khác trong cùng vòng lặp —
    // gộp thành 1 `Promise.all` thay vì `await` tuần tự từng node. Đánh đổi đã công bố có chủ
    // đích: trước đây một node NOT_FOUND (0 kết quả) sẽ "short-circuit" — các node phía sau
    // không còn được fetch nữa. Sau thay đổi này, TẤT CẢ node đều được fetch song song trước khi
    // hàm kiểm tra NOT_FOUND — nghĩa là trên nhánh 404 (hiếm hơn), các node phía sau vẫn tốn
    // query GraphQL dù kết quả bị vứt bỏ ngay sau đó. Đổi lại: nhánh 200 (phổ biến hơn nhiều)
    // có latency thấp hơn hẳn vì không còn chờ tuần tự từng node. Đây là thay đổi hành vi có
    // chủ đích, KHÔNG phải bug — không cố giữ lại early-exit cũ.
    const prefetchedRepeatEntries = new Map<string, Record<string, any>[]>();
    let pageEntry: ContentEntryDTO | undefined;
    if (nodeTree) {
        const singleEntryNodes = findSingleEntryNodes(nodeTree);
        const resultsPerNode = await Promise.all(
            singleEntryNodes.map((node) => fetchRepeatEntries(node.repeat!, { locale, pathParams, queryParams })),
        );
        let hasNotFound = false;
        singleEntryNodes.forEach((node, i) => {
            const resolvedEntries = resultsPerNode[i];
            prefetchedRepeatEntries.set(node.id ?? '', resolvedEntries);
            if (resolvedEntries.length === 0 && node.repeat!.onNotFound === ERepeatOnNotFound.NOT_FOUND) hasNotFound = true;
        });
        if (hasNotFound) return null;
        const firstEntry = singleEntryNodes[0] ? prefetchedRepeatEntries.get(singleEntryNodes[0].id ?? '')?.[0] : undefined;
        pageEntry = firstEntry ? { id: firstEntry.id, contentTypeId: firstEntry.contentTypeId, data: firstEntry.data } as ContentEntryDTO : undefined;
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
    const theme = resolved.theme ? asJsonTyped<ThemeDTO>(resolved.theme) : undefined;
    const pageStyle = resolved.page.style ? asJsonTyped<PageStyle>(resolved.page.style as unknown as object) : undefined;
    // `availableTranslations` đã được fetch song song với node-tree ở trên (Task 12) — xem
    // `translationGroupId` cùng comment đầu hàm.
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

    return { seo, pageEntry, contentTypeFields, header, footer, theme, pageStyle, availableTranslations, nodeTree, locale, pathParams, prefetchedRepeatEntries };
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
