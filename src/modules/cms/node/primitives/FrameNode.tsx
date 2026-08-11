// src/modules/cms/node/primitives/FrameNode.tsx
import { For } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeRenderer } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';

/** `style`/`layoutMode` là field JSON/enum nullable ở tầng codegen (mọi field NodeDTO đều
 * `T | undefined`, xem comment ở applyNodeLayout.test.ts) — `?? {}` và cast
 * `ELayoutMode | undefined` ở đây theo đúng convention buildNodeTree.ts đã dùng, KHÔNG
 * đổi lại node.types.ts (field không phải JSONB, không thuộc phạm vi override ở đó). */
export function FrameNode(props: NodeComponentProps) {
    const style = () => ({ ...applyContainerLayout(props.node), ...applyNodeStyle(props.node.style ?? {}) });
    return (
        <div style={style()}>
            <For each={props.node.children}>
                {(child) => <NodeRenderer node={child} context={props.context} parentLayoutMode={props.node.layoutMode as ELayoutMode | undefined} />}
            </For>
        </div>
    );
}
