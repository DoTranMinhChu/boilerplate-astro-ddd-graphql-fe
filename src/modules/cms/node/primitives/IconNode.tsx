// src/modules/cms/node/primitives/IconNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { Icon } from '@/shared/components/icons/Icon';

export function IconNode(props: NodeComponentProps) {
    const iconName = () => props.node.props?.icon ?? 'heroicons-solid:star';
    return <span style={applyNodeStyle(props.node.style ?? {})}><Icon name={iconName()} /></span>;
}
