// src/modules/cms/node/primitives/ShapeNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function ShapeNode(props: NodeComponentProps) {
    const shape = () => props.node.props?.shape ?? 'rectangle';
    const style = () => ({
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        'border-radius': shape() === 'ellipse' ? '50%' : (applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())['border-radius'] ?? '0px'),
    });
    return <div use:nodeAnimation={props.node.animationRef} style={style()} />;
}
