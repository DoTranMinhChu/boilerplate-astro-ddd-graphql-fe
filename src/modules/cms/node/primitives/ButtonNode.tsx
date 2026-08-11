// src/modules/cms/node/primitives/ButtonNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';

export function ButtonNode(props: NodeComponentProps) {
    const label = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.label ?? 'Nút bấm');
    const href = () => props.node.props?.href as string | undefined;
    return href() ? (
        <a href={href()} style={applyNodeStyle(props.node.style ?? {})}>{label()}</a>
    ) : (
        <button type="button" style={applyNodeStyle(props.node.style ?? {})}>{label()}</button>
    );
}
