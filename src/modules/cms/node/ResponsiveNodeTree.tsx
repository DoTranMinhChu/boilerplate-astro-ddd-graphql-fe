// src/modules/cms/node/ResponsiveNodeTree.tsx
//
// Phase 3 (Responsive) — the public site's actual client:visible hydration root,
// replacing a direct <NodeRenderer> mount. Astro serializes props passed to a
// client:visible island as plain JSON at hydration time — a live Solid signal
// can't cross that boundary. useBreakpoint() (real window-width detection) must
// therefore be called INSIDE the hydrated Solid tree, not constructed as a plain
// value in the .astro frontmatter. This component is that one extra layer: it
// calls useBreakpoint() once and supplies `device` to the context NodeRenderer
// already expects, leaving every other context field exactly as the caller built it.
import { useBreakpoint } from '@core/hooks/useBreakpoint';
import { NodeRenderer } from './NodeRenderer';
import type { NodeTree, NodeRenderContext } from './node.types';

export interface ResponsiveNodeTreeProps {
    node: NodeTree;
    /** Every NodeRenderContext field EXCEPT `device` — this component supplies
     * `device` itself from useBreakpoint(), live. */
    context: Omit<NodeRenderContext, 'device'>;
}

export function ResponsiveNodeTree(props: ResponsiveNodeTreeProps) {
    const { breakpoint } = useBreakpoint();
    return <NodeRenderer node={props.node} context={{ ...props.context, device: breakpoint }} />;
}
