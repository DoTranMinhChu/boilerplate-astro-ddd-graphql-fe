// src/modules/cms/node/useNodeAnimation.ts
//
// Solid custom directive: `use:nodeAnimation={props.node.animationRef}` — the
// AnimationTimeline-driven counterpart to `useAnimate.ts`'s `use:animate={layer}`.
// Kept as a fully separate file/directive name (not a modification of useAnimate.ts)
// so the two systems can never accidentally collide or be confused for one another.
import { onCleanup, onMount } from 'solid-js';
import { applyAnimationTimeline } from './applyAnimationTimeline';
import type { AnimationTimeline } from './animationTimeline.types';

export function nodeAnimation(el: Element, value: () => AnimationTimeline | undefined | null) {
    onMount(() => {
        const timeline = value();
        if (!timeline) return;
        const cleanup = applyAnimationTimeline(el, timeline);
        onCleanup(cleanup);
    });
}

// Register the directive's type for JSX (`use:nodeAnimation`).
declare module 'solid-js' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface Directives {
            nodeAnimation: AnimationTimeline | undefined | null;
        }
    }
}
