// src/modules/cms/node/primitives/ImageNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.alt ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    return <img use:nodeAnimation={props.node.animationRef} src={src()} alt={alt()} style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())} />;
}
