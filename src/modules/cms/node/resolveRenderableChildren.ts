// src/modules/cms/node/resolveRenderableChildren.ts
import type { NodeTree, NodeRenderContext } from './node.types';
import { ERepeatSource } from './node.types';
import { evaluateVisibilityRules } from './evaluateVisibilityRules';
import { SELF_RESOLVING_REPEAT_NODE_TYPES, EFrameBehaviorType } from './node.constants';

export interface RenderableChild {
    node: NodeTree;
    context: NodeRenderContext;
    /** Stable React/Solid key — plain node.id for non-repeated children, `${node.id}:${index}`
     * for repeat-expanded copies so `<For>` doesn't collide keys. `node.id` is `string |
     * undefined` at the type level (every NodeDTO field is, per codegen — see
     * applyNodeLayout.test.ts's comment) — `?? ''` here matches buildNodeTree.ts's existing
     * convention for the same field. */
    key: string;
}

/** Áp visibilityRules (ẩn hẳn) rồi expand `repeat` (0..N bản sao, mỗi bản 1 context
 * riêng) — kết quả là danh sách phẳng thực sự cần render, đúng thứ tự. `repeatEntriesByNodeId`
 * map từ nodeId → entries đã fetch sẵn (fetchRepeatEntries chạy async ở NodeRenderer,
 * kết quả nạp vào map này trước khi gọi hàm thuần này). */
export function resolveRenderableChildren(
    children: NodeTree[],
    parentContext: NodeRenderContext,
    repeatEntriesByNodeId: Map<string, Record<string, any>[]> = new Map(),
): RenderableChild[] {
    const result: RenderableChild[] = [];
    for (const node of children) {
        if (!evaluateVisibilityRules(node.visibilityRules, parentContext)) continue;
        // Node-level data binding (2026-08-17): TABLE/CARD_LIST resolve + iterate their OWN
        // `repeat` internally (one <table>/one grid, N rows/cards inside it) — they must NOT be
        // expanded here the way a FRAME repeat-template is (which would clone the whole Table
        // node once per matched row, producing N separate <table> elements instead of one table
        // with N rows). See SELF_RESOLVING_REPEAT_NODE_TYPES's doc comment.
        // Task 1 (carousel Frame foundation, 2026-08-23): a Frame with `props.behavior.type ===
        // 'carousel'` is the upcoming self-resolving carousel primitive (renders exactly ONE
        // entry at a time via its own createResource, cycling on a timer, NOT N sibling clones)
        // — excluded here the same way SELF_RESOLVING_REPEAT_NODE_TYPES is, just keyed off
        // `props.behavior.type` instead of `node.type` (a carousel Frame is still type 'frame',
        // so it can't be added to that Set without also excluding every non-carousel Frame).
        if (node.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(node.type ?? '') && (node.props as any)?.behavior?.type !== EFrameBehaviorType.CAROUSEL) {
            // `entries` here are raw `ContentEntryDTO[]` (from fetchRepeatEntries →
            // getPublicContentEntries/getRelatedContentEntries/etc., see nodeDataBinding.ts) —
            // `{id, data, contentTypeId, status, locale, ...}`, field VALUES nested under
            // `.data`. Final-review fix Critical #1: standardize `contextEntry` on the FLAT
            // shape (matching CmsPageShell.astro + resolveBoundValue/evaluateVisibilityRules)
            // instead of passing the whole DTO — `entry.data` gives the flat field map, and
            // `entry.id` goes into the separate `contextEntryId` field for the 'related'/
            // 'backlink' fetchRepeatEntries branches that need the entry's OWN id.
            // Final-review fix Important #1: each clone must carry ITS OWN entry's
            // `contentTypeId` (every ContentEntryDTO has one, per the doc comment above -
            // see MixedFeedNode.tsx's `entry.contentTypeId` usage) as `contextEntryContentTypeId`,
            // instead of silently inheriting the page-wide value resolveCmsPageProps.ts /
            // CmsPageShell.astro compute from the first cardinality:'one' node in the whole
            // tree. Without this, a ContentDetailNode nested under THIS repeat clone would
            // resolve field definitions against the wrong content type whenever the page has
            // more than one distinct single-entry content type, or the ContentDetailNode sits
            // under a cardinality:'many' repeat rather than the page-level one.
            const entries = repeatEntriesByNodeId.get(node.id ?? '') ?? [];
            entries.forEach((entry, i) => {
                result.push({
                    node,
                    context: {
                        ...parentContext,
                        contextEntry: entry.data,
                        contextEntryId: entry.id,
                        contextEntryContentTypeId: entry.contentTypeId,
                        contextHref: entry.__detailHref,
                        contextEntryIndex: i,
                        // MixedFeed close-out (2026-08-22): threaded down so leaf Text/Image nodes
                        // under this repeat clone can resolve mixedField bindings — see
                        // NodeRenderContext.contextMixedSources's doc comment (node.types.ts).
                        contextMixedSources: node.repeat?.source === ERepeatSource.MIXED ? node.repeat.sources : undefined,
                    },
                    key: `${node.id ?? ''}:${i}`,
                });
            });
            continue;
        }
        result.push({ node, context: parentContext, key: node.id ?? '' });
    }
    return result;
}
