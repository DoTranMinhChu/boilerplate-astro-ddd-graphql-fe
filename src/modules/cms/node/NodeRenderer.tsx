// src/modules/cms/node/NodeRenderer.tsx
import { createResource, For, Show, ErrorBoundary } from 'solid-js';
import type { NodeTree, NodeRenderContext } from './node.types';
import type { ELayoutMode } from './node.constants';
import { nodeRegistry } from './nodeRegistry';
import { resolveRenderableChildren } from './resolveRenderableChildren';
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

    return (
        <Show when={Comp()} fallback={<UnknownNodeWarning type={props.node.type ?? ''} />}>
            <div style={itemStyle()}>
                <ErrorBoundary fallback={(err) => <NodeErrorFallback error={err} type={props.node.type ?? ''} />}>
                    {Comp()!({ node: props.node, context: props.context })}
                </ErrorBoundary>
            </div>
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
            map.set(n.id ?? '', await fetchRepeatEntries(n.repeat!));
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
    console.error(`[CMS] Node type không tồn tại trong nodeRegistry: "${props.type}"`);
    if (import.meta.env.DEV) {
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
