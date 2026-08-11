// src/modules/cms/node/primitives/ShapeNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';

export function ShapeNode(props: NodeComponentProps) {
    const shape = () => props.node.props?.shape ?? 'rectangle';
    const style = () => ({
        ...applyNodeStyle(props.node.style ?? {}),
        'border-radius': shape() === 'ellipse' ? '50%' : (applyNodeStyle(props.node.style ?? {})['border-radius'] ?? '0px'),
    });
    return <div style={style()} />;
}
