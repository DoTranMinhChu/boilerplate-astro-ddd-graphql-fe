// src/modules/cms/node/getLayerForNode.ts
import type { NodeTree } from './node.types';
import type { AnimationLayer } from '@/modules/cms/cms.types';

/** Node-tree equivalent of `sectionHelpers.ts`'s `getLayer()` — reads animation layers from
 * `node.props.legacyAnimation` (an `AnimationLayer[]`, written verbatim by
 * `migrateSectionsToNodes.ts` from the migrated Section's own `animation` column — see Phase 0
 * M2b spec §1) instead of `section.animation`. Deliberately NOT added to/reused from
 * `sectionHelpers.ts` — that file is Section-only and untouched by this migration; Node has its
 * own AnimationTimeline concept coming in Phase 3/4, `legacyAnimation` is a stopgap until then. */
export function getLayerForNode(node: NodeTree, target: string): AnimationLayer | undefined {
    const raw = node.props?.legacyAnimation;
    const layers = Array.isArray(raw) ? (raw as AnimationLayer[]) : [];
    return layers.find((l) => l.target === target);
}
