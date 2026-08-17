// src/modules/cms/node/primitives/TextNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

// Referenced so bundlers/TS don't tree-shake/flag the import as unused — Solid
// directives are invoked by the compiler via the `use:` JSX attribute, not a normal
// function call, so a bare import can look "unused" to some tooling.
void nodeAnimation;

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '');
    return <p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}>{text()}</p>;
}
