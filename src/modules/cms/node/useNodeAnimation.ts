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
        // Task 10 (perf/scale): `applyAnimationTimeline` is now async (it lazy-loads gsap on
        // demand instead of shipping it in every page's bundle) — guard against the component
        // unmounting BEFORE the dynamic import resolves. Without `cancelled`, a fast unmount
        // (e.g. client-side route change) would let the `.then()` callback stash a live cleanup
        // function into `cleanupFn` AFTER `onCleanup` already ran, leaking the gsap
        // context/ScrollTrigger instance this node created. If that race happens, run the
        // cleanup immediately instead of ever exposing it via `cleanupFn`.
        let cancelled = false;
        let cleanupFn: (() => void) | undefined;
        applyAnimationTimeline(el, timeline).then((cleanup) => {
            if (cancelled) {
                cleanup();
                return;
            }
            cleanupFn = cleanup;
        });
        onCleanup(() => {
            cancelled = true;
            cleanupFn?.();
        });
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
