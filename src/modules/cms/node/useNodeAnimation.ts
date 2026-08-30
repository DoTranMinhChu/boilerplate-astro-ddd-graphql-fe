// src/modules/cms/node/useNodeAnimation.ts
//
// Solid custom directive: `use:nodeAnimation={props.node.animationRef}` — drives every
// node's `AnimationTimeline` via `applyAnimationTimeline.ts`.
//
// Historically (Phase 4 and earlier) this was the AnimationTimeline-driven counterpart
// to an older `useAnimate.ts` directive (`use:animate={layer}`), kept as a fully
// separate file/directive name on purpose so the two systems couldn't collide or be
// confused for one another. As of Motion System Unification (Phase 5), `useAnimate.ts`
// and the whole system behind it were fully deleted — this directive is now the ONLY
// animation directive in the codebase; there is nothing left for it to stay separate
// from.
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
