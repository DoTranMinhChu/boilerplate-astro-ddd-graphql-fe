// src/modules/cms/node/primitives/VideoNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function VideoNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '', props.context.contextEntryIndex);
    return (
        <video
            use:nodeAnimation={props.node.animationRef}
            src={src()}
            autoplay={props.node.props?.autoplay ?? false}
            loop={props.node.props?.loop ?? false}
            muted={props.node.props?.muted ?? true}
            controls={props.node.props?.controls ?? true}
            style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}
        />
    );
}
