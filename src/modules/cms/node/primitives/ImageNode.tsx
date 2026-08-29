// src/modules/cms/node/primitives/ImageNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

// Only these 2 properties belong on the <img> itself — every other applyNodeStyle() output
// (size/spacing/border/shadow/effects/transform/aspect-ratio/clip-path) belongs on the wrapper,
// which the <img> then fills completely via the unconditional width/height/display below. This
// keeps every pre-Phase-4 ImageNode usage rendering byte-identical: the wrapper now carries what
// used to be on the img directly, and the img filling it 100% reproduces the same visual box.
const IMG_ONLY_KEYS = new Set(['object-fit', 'object-position']);

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.alt ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);

    const fullStyle = () => applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device());

    const wrapperStyle = () => {
        const css: Record<string, string> = {};
        for (const [k, v] of Object.entries(fullStyle())) {
            if (!IMG_ONLY_KEYS.has(k)) css[k] = v;
        }
        return css;
    };

    const imgStyle = () => {
        const full = fullStyle();
        const css: Record<string, string> = {
            width: '100%',
            height: '100%',
            display: 'block',
            'object-fit': full['object-fit'] ?? 'cover',
        };
        if (full['object-position']) css['object-position'] = full['object-position'];
        return css;
    };

    return (
        <div style={wrapperStyle()}>
            <img use:nodeAnimation={props.node.animationRef} src={src()} alt={alt()} loading="lazy" style={imgStyle()} />
        </div>
    );
}
