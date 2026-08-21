// src/modules/cms/node/primitives/TextNode.tsx
import { Show, createUniqueId } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

// Referenced so bundlers/TS don't tree-shake/flag the import as unused — Solid
// directives are invoked by the compiler via the `use:` JSX attribute, not a normal
// function call, so a bare import can look "unused" to some tooling.
void nodeAnimation;

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '', props.context.contextEntryIndex);
    const isRichText = () => props.node.props?.richText === true;
    const style = () => props.node.style ?? {};
    const isVideoFill = () => style().typography?.color?.type === 'video' && !!style().typography?.color?.value;
    const maskId = createUniqueId();

    return (
        <Show
            when={isRichText()}
            fallback={
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
            }
        >
            {/* final-review fix: MUST be a <div>, not <p> — rich text is typically authored as
                <p>...</p> block content (every richtext-control field in this codebase produces
                that), and a <p> cannot legally contain another <p>. Setting innerHTML on a <p>
                with block content builds a valid tree client-side, but this tree is SSR'd
                (CmsPageShell.astro's <ResponsiveNodeTree client:visible>) — the browser re-parses
                the served HTML text and auto-closes the outer <p> at the first nested block tag,
                hoisting the real content out as SIBLINGS of an now-EMPTY styled <p>. That silently
                detaches every inline style (font/color/spacing), the hover-CSS system (which
                targets "this wrapper's single child" — see applyNodeHoverStyle.ts), and
                use:nodeAnimation from the actual visible content. Matches every other
                DOMPurify+innerHTML site in this codebase (ContentDetailNode/LogoGridNode/
                SpotlightListNode/InquiryFormNode/AccordionListNode), which all use <div>. */}
            <div use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())} innerHTML={DOMPurify.sanitize(text())} />
        </Show>
    );
}
