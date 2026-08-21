// src/modules/cms/node/primitives/FrameNode.tsx
import { Show, createSignal, createEffect } from 'solid-js';
import { gsap } from 'gsap';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

/** Phase A2a — accordion-item behavior config, read from `node.props.behavior` (the existing
 * generic props catch-all, deliberately NOT a new top-level Node field — see
 * docs/superpowers/specs/2026-08-21-frame-accordion-behavior-design.md §1 for why: a new
 * top-level field would need a backend schema change and a 4th hardcoded persistence list to
 * keep in sync, the exact bug class Phase 4's animationRef rollout hit). */
interface FrameBehaviorConfig {
    type: 'accordion-item';
    defaultOpen?: boolean;
}

/** `style`/`layoutMode` là field JSON/enum nullable ở tầng codegen (mọi field NodeDTO
 * đều `T | undefined`, xem comment ở applyNodeLayout.test.ts) — `?? {}`/cast +
 * fallback `'flow'` ở đây theo đúng convention buildNodeTree.ts đã dùng, KHÔNG đổi lại
 * node.types.ts (field không phải JSONB, không thuộc phạm vi override ở đó).
 *
 * Phase 0 M2a: `props.asLink=true` biến Frame thành thẻ <a> tới `context.contextHref`
 * (URL trang Chi tiết của contextEntry hiện tại, do repeat cha có `linkToDetail:true` gắn
 * vào — xem nodeDataBinding.ts/resolveRenderableChildren.ts) — dùng cho "thẻ card" trong
 * lưới CONTENT_GRID/RELATED_ENTRIES/MIXED_FEED/BACKLINK_ENTRIES, thay hẳn <div> nếu không
 * phải context repeat-có-link (contextHref undefined) thì vẫn render <div> như trước, không
 * đổi hành vi cho MỌI Frame khác trong hệ thống.
 *
 * Phase A2a: `props.behavior.type === 'accordion-item'` is a THIRD top-level rendering branch,
 * checked before isLink()/plain-<div> — a Frame can be either an accordion item OR a link OR
 * plain, never a combination (accordion's own <button>/<div> wrapper already needs the space
 * `<a>` would otherwise occupy; no known use case needs both at once). */
export function FrameNode(props: NodeComponentProps) {
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;
    const isVideoBackground = () => props.node.style?.background?.type === 'video' && !!props.node.style?.background?.value;
    const behavior = () => props.node.props?.behavior as FrameBehaviorConfig | undefined;
    const isAccordion = () => behavior()?.type === 'accordion-item';

    const style = () => ({
        ...applyContainerLayout(props.node, props.context.device()),
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        // A video background layer (below) needs `position: relative` on this box so it can
        // be absolutely positioned to fill it — harmless to always set since Frame's own
        // layout props (flex/grid) are unaffected by `position`.
        position: 'relative' as const,
        // `position: relative` alone does NOT create a new CSS stacking context (z-index stays
        // `auto`), so the video layer's `-z-10` (below) could hoist past THIS box and paint
        // behind whatever the nearest actual stacking-context ancestor is (e.g. an outer Frame's
        // own background color, if this Frame is nested inside one). `isolation: isolate` forces
        // a real stacking context here so the negative z-index stays contained — only needed
        // when the video layer actually renders, so it's conditional rather than set on every
        // Frame.
        ...(isVideoBackground() ? { isolation: 'isolate' as const } : {}),
    });

    const videoLayer = () => (
        <Show when={isVideoBackground()}>
            <video
                src={props.node.style!.background!.value}
                autoplay
                muted
                loop
                playsinline
                class="absolute inset-0 -z-10 h-full w-full object-cover"
            />
        </Show>
    );

    if (isAccordion()) {
        const [open, setOpen] = createSignal(behavior()?.defaultOpen ?? false);
        const trigger = () => props.node.children[0];
        const body = () => props.node.children.slice(1);
        let bodyRef: HTMLDivElement | undefined;

        createEffect((prevOpen: boolean | undefined) => {
            const isOpen = open();
            // Skip animating on the FIRST run — SSR/mount output already matches defaultOpen
            // with zero JS (the inline height below is computed straight from the signal), so
            // animating on mount would be a spurious "expand" flash for a defaultOpen:true item.
            if (bodyRef && prevOpen !== undefined) {
                gsap.to(bodyRef, { height: isOpen ? 'auto' : 0, duration: 0.3, ease: 'power2.inOut' });
            }
            return isOpen;
        }, undefined);

        return (
            <div use:nodeAnimation={props.node.animationRef} style={style()}>
                <button
                    type="button"
                    onClick={() => setOpen(!open())}
                    aria-expanded={open()}
                    style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
                >
                    <NodeChildrenList children={trigger() ? [trigger()] : []} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
                </button>
                <div ref={bodyRef} style={{ overflow: 'hidden', height: open() ? 'auto' : '0px' }}>
                    <NodeChildrenList children={body()} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
                </div>
            </div>
        );
    }

    return isLink() ? (
        <a use:nodeAnimation={props.node.animationRef} href={props.context.contextHref} style={style()}>
            {videoLayer()}
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </a>
    ) : (
        <div use:nodeAnimation={props.node.animationRef} style={style()}>
            {videoLayer()}
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </div>
    );
}
