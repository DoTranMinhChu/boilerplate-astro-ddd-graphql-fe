// src/modules/cms/node/primitives/ImageNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '');
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.alt ?? '');
    return <img use:nodeAnimation={props.node.animationRef} src={src()} alt={alt()} style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())} />;
}
