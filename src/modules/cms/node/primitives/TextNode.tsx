// src/modules/cms/node/primitives/TextNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '');
    return <p style={applyNodeStyle(props.node.style ?? {})}>{text()}</p>;
}
