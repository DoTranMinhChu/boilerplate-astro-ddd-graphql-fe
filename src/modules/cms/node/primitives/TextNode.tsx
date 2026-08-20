// src/modules/cms/node/primitives/TextNode.tsx
import { Show, createUniqueId } from 'solid-js';
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
    const style = () => props.node.style ?? {};
    const isVideoFill = () => style().typography?.color?.type === 'video';
    const maskId = createUniqueId();

    return (
        <Show
            when={isVideoFill()}
            fallback={<p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())}>{text()}</p>}
        >
            {/* Video-as-text-fill (scoped to short/single-line headline text — see
                docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md
                §4): no CSS property lets a <video> fill text directly, so the video plays as a
                normal element and an SVG <mask> containing matching <text> clips it to the
                glyph shapes. `t.color.value` is only read for `video` here — every other mode
                is fully handled by `applyNodeStyle`'s inline style, unchanged from before. */}
            <span class="relative inline-block" style={applyNodeStyle({ ...style(), typography: { ...style().typography, color: undefined } }, props.node.responsiveOverrides, props.context.device())}>
                <span class="sr-only" aria-label={text()}>{text()}</span>
                <svg width="0" height="0" aria-hidden="true" class="absolute">
                    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                        <text
                            x="0"
                            y="1em"
                            fill="#fff"
                            font-family={style().typography?.fontFamily ?? 'inherit'}
                            font-size={style().typography?.size ? `${style().typography!.size}px` : '1em'}
                            font-weight={style().typography?.weight ?? 400}
                        >
                            {text()}
                        </text>
                    </mask>
                </svg>
                <video
                    src={style().typography!.color!.value}
                    autoplay
                    muted
                    loop
                    playsinline
                    class="absolute inset-0 h-full w-full object-cover"
                    style={{ mask: `url(#${maskId})`, '-webkit-mask': `url(#${maskId})` }}
                />
                {/* Reserves layout space matching the text's own metrics — the video is
                    absolutely positioned over this invisible copy, same box either way. */}
                <span class="invisible" aria-hidden="true">{text()}</span>
            </span>
        </Show>
    );
}
