// src/modules/cms/node/NodeRenderer.tsx
import { createResource, For, Show, ErrorBoundary } from 'solid-js';
import type { NodeTree, NodeRenderContext } from './node.types';
import type { ELayoutMode } from './node.constants';
import { nodeRegistry } from './nodeRegistry';
import { resolveRenderableChildren } from './resolveRenderableChildren';
import { evaluateVisibilityRules } from './evaluateVisibilityRules';
import { fetchRepeatEntries } from './nodeDataBinding';
import { applyChildLayout } from './applyNodeLayout';

export interface NodeRendererProps {
    node: NodeTree;
    context: NodeRenderContext;
    /** layoutMode của node CHA — quyết định node này được đặt theo flow item-props
     * hay free absolute-position. Root call (từ CmsPageShell) không truyền — coi
     * như 'flow' (root luôn là 1 flow frame, xem spec §2). */
    parentLayoutMode?: ELayoutMode;
}

/** Đơn vị render đệ quy DUY NHẤT cho toàn cây Node — admin canvas và trang public
 * dùng CHUNG component này (what-you-see-is-what-you-get, xem spec §7). 1 node lỗi
 * không sập cả cây (ErrorBoundary riêng từng node, cùng nguyên lý SectionRenderer). */
export function NodeRenderer(props: NodeRendererProps) {
    // `props.node.type` là `string | undefined` ở tầng codegen (mọi field NodeDTO đều vậy) —
    // `?? ''` để index vào Record<string, Component> (index signature yêu cầu key: string).
    const Comp = () => nodeRegistry[props.node.type ?? ''];
    const itemStyle = () => applyChildLayout(props.node, props.parentLayoutMode ?? 'flow');
    // Final-review fix Important #1: `resolveRenderableChildren.ts` evaluates visibilityRules
    // ONLY for a node's children (called from `NodeChildrenList` below) — a ROOT node (mounted
    // directly from CmsPageShell.astro/NodeBuilder.page.tsx) never passes through that path, so
    // a visibility rule set on a root node was silently never evaluated. Checking it again here,
    // right at the top of NodeRenderer itself, closes that gap for both roots AND recursive
    // calls — for children it's a harmless, idempotent second check (already true by the time
    // NodeRenderer is invoked for them), not a regression.
    const visible = () => evaluateVisibilityRules(props.node.visibilityRules, props.context);

    return (
        <Show when={visible()}>
            <Show when={Comp()} fallback={<UnknownNodeWarning type={props.node.type ?? ''} />}>
                <div style={itemStyle()}>
                    <ErrorBoundary fallback={(err) => <NodeErrorFallback error={err} type={props.node.type ?? ''} />}>
                        {Comp()!({ node: props.node, context: props.context })}
                    </ErrorBoundary>
                </div>
            </Show>
        </Show>
    );
}

/** Dùng trong FrameNode để render 1 danh sách children đã resolve visibility+repeat.
 * Tách riêng khỏi FrameNode để mọi container tương lai (widget dev tự viết, có
 * `acceptsChildren: true`) đều gọi lại được, không phải viết lại logic. */
export function NodeChildrenList(props: { children: NodeTree[]; context: NodeRenderContext; parentLayoutMode: ELayoutMode }) {
    const repeatNodes = () => props.children.filter((c) => c.repeat);
    const [entriesByNodeId] = createResource(repeatNodes, async (nodes) => {
        const map = new Map<string, Record<string, any>[]>();
        await Promise.all(nodes.map(async (n) => {
            // Final-review fix Important #2: `locale` PHẢI truyền xuống mọi query công khai đọc
            // ContentEntry (cùng lớp bug đã fix cho Section's data pipeline — xem "Critical #1
            // fix" comment ở resolveCmsPageProps.ts) — thiếu nó thì entry của MỌI locale trong 1
            // nhóm dịch sẽ trộn lẫn vào cùng 1 khối repeat.
            // Phase 0 M1 Task 8: fetchRepeatEntries giờ cần cả pathParams/queryParams (filter
            // 'own' dynamic qua resolveGenericDataSource) và contextEntry (source 'related'/
            // 'backlink' cần contextEntry.id) — truyền nguyên object context, không chỉ locale.
            map.set(n.id ?? '', await fetchRepeatEntries(n.repeat!, {
                locale: props.context.locale,
                pathParams: props.context.pathParams,
                queryParams: props.context.queryParams,
                contextEntry: props.context.contextEntry,
            }));
        }));
        return map;
    });

    const renderable = () => resolveRenderableChildren(props.children, props.context, entriesByNodeId() ?? new Map());

    return (
        <For each={renderable()}>
            {(item) => <NodeRenderer node={item.node} context={item.context} parentLayoutMode={props.parentLayoutMode} />}
        </For>
    );
}

function UnknownNodeWarning(props: { type: string }) {
    // Final-review fix Important #4: `scripts/migrateSectionsToNodes.ts` (BE) writes
    // `type: legacy:${section.type}` for every migrated block — nodeRegistry correctly has no
    // entry for any `legacy:*` type by design (full legacy-block rendering is Phase 6 scope, not
    // Phase 1). Without this check, a deliberately-deferred legacy type hit the exact same
    // `console.error`/"chưa được đăng ký" path as a genuinely broken/mistyped node, with no way
    // to tell the two apart. Cosmetic/diagnostic only — no new rendering logic for legacy types.
    const isLegacy = props.type.startsWith('legacy:');
    if (isLegacy) {
        console.info(`[CMS] Legacy migrated block "${props.type}" — rendering deferred to Phase 6.`);
    } else {
        console.error(`[CMS] Node type không tồn tại trong nodeRegistry: "${props.type}"`);
    }
    if (import.meta.env.DEV) {
        if (isLegacy) {
            return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-neutral-500 border border-neutral-200 bg-neutral-50 rounded-lg my-2">
                ℹ Khối cũ (di trú từ Section) — chưa hỗ trợ render ở Phase 1: "{props.type}".
            </div>;
        }
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded-lg my-2">
            ⚠ Node type "{props.type}" chưa được đăng ký trong nodeRegistry (chỉ hiện ở dev/preview).
        </div>;
    }
    return null;
}

function NodeErrorFallback(props: { error: unknown; type: string }) {
    console.error(`[CMS] Lỗi khi render node "${props.type}":`, props.error);
    if (import.meta.env.DEV) {
        const message = props.error instanceof Error ? props.error.message : String(props.error);
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg my-2">
            ⚠ Lỗi render node "{props.type}": {message}
        </div>;
    }
    return null;
}
