// src/modules/cms/node/resolveBindableContentType.ts
import type { NodeDTO } from './node.types';
import { ERepeatSource } from './node.types';

/** Walks from `nodeId` UP through `parentId` (inclusive of the node itself) looking for the
 * nearest ancestor whose `repeat` declares a KNOWN content type an admin can bind fields
 * against in the Data Binding tab — regardless of `repeat.cardinality` ('one' or 'many'
 * both work identically here, unlike `NodeBuilder.page.tsx`'s separate, narrower
 * `boundContentTypeId()` used only for root-level ContentDetailNode canvas preview, which
 * stays restricted to `cardinality:'one'` and is NOT this function).
 *
 * Per-source resolution (see 2026-08-19 repeat-item-data-binding-design.md §0):
 * - `own` (default/unset): `repeat.contentTypeKey`, already known statically.
 * - `backlink`: `repeat.sourceContentTypeId` — a real `BacklinkEntriesQueryInput` param.
 * - `related`: `repeat.relatedContentTypeKey` — FE-only, admin-DECLARED assumption (the real
 *   `RelatedEntriesQueryInput` has no content-type param at all; content type of returned
 *   entries is only known after fetch, and may vary per entry).
 * - `mixed`: never resolvable here by design (genuinely polymorphic per entry) — the walk
 *   simply continues past a `mixed` ancestor rather than stopping, in case an outer ancestor
 *   is independently bindable.
 * - Any `repeat` present but not yet configured (e.g. `contentTypeKey` unset) is likewise
 *   skipped, continuing the walk upward. */
export function resolveBindableContentType(nodeId: string | undefined, nodesById: Map<string, NodeDTO>): string | undefined {
    let current = nodeId ? nodesById.get(nodeId) : undefined;
    while (current) {
        const r = current.repeat;
        if (r) {
            const source = r.source ?? ERepeatSource.OWN;
            if (source === ERepeatSource.OWN && r.contentTypeKey) return r.contentTypeKey;
            if (source === ERepeatSource.BACKLINK && r.sourceContentTypeId) return r.sourceContentTypeId;
            if (source === ERepeatSource.RELATED && r.relatedContentTypeKey) return r.relatedContentTypeKey;
        }
        current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }
    return undefined;
}
