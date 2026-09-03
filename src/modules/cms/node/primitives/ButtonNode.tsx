// src/modules/cms/node/primitives/ButtonNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { EDataBindingMode } from '../node.types';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function ButtonNode(props: NodeComponentProps) {
    const label = () => resolveBoundValue(props.node.dataBinding ?? { mode: EDataBindingMode.STATIC }, props.context.contextEntry, props.node.props?.label ?? 'Nút bấm', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const href = () => props.node.props?.href as string | undefined;
    return href() ? (
        <a use:nodeAnimation={props.node.animationRef} href={href()} style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}>{label()}</a>
    ) : (
        <button use:nodeAnimation={props.node.animationRef} type="button" style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}>{label()}</button>
    );
}
