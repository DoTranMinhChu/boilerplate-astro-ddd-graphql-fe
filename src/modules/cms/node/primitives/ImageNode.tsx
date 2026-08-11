// src/modules/cms/node/primitives/ImageNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '');
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.alt ?? '');
    return <img src={src()} alt={alt()} style={applyNodeStyle(props.node.style ?? {})} />;
}
