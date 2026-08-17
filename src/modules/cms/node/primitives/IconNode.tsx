// src/modules/cms/node/primitives/IconNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { Icon } from '@/shared/components/icons/Icon';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function IconNode(props: NodeComponentProps) {
    const iconName = () => props.node.props?.icon ?? 'heroicons-solid:star';
    return <span use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}><Icon name={iconName()} /></span>;
}
