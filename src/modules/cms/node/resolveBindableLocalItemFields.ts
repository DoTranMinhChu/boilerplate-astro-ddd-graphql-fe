// src/modules/cms/node/resolveBindableLocalItemFields.ts
import type { NodeDTO } from './node.types';
import { ERepeatSource } from './node.types';
import type { FieldDescriptor } from './node.fieldSchema.types';

/** Walks from `nodeId` UP through `parentId` (inclusive of the node itself) looking for the
 * nearest ancestor whose `repeat.source==='local'` has a defined item shape — the local-repeat
 * counterpart of `resolveBindableContentType.ts` (which does the identical walk for a real
 * Content-Type-bound ancestor). Synchronous and free — unlike the content-type case, there is
 * no ID to resolve and no network fetch to trigger, `localItemFields` already lives on the
 * node itself. An ancestor with `repeat.source==='local'` but no `localItemFields` set yet
 * (freshly toggled on, not configured) is treated as not-yet-bindable and the walk continues
 * past it, matching resolveBindableContentType's identical "present but unconfigured" skip. */
export function resolveBindableLocalItemFields(nodeId: string | undefined, nodesById: Map<string, NodeDTO>): FieldDescriptor[] | undefined {
    let current = nodeId ? nodesById.get(nodeId) : undefined;
    while (current) {
        if (current.repeat?.source === ERepeatSource.LOCAL && current.repeat.localItemFields?.length) {
            return current.repeat.localItemFields;
        }
        current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }
    return undefined;
}
