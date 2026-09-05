// src/modules/cms/admin/nodeBuilder/EffectCard.tsx
//
// Property Inspector redesign, Phase 2 — one visual effect card in the EffectPicker grid.
// Hovering plays a REAL preview using applyAnimationTimeline (the same engine that animates
// real nodes on the canvas) against this card's own small demo box — not a CSS approximation,
// per explicit user choice during Phase 2 brainstorming (accuracy over a lighter-weight fake).
import { onCleanup } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { applyAnimationTimeline } from '@/modules/cms/node/applyAnimationTimeline';
import type { EffectDefinition } from '@/modules/cms/node/effectRegistry';
import { EAnimationTrigger } from '@/modules/cms/node/animationTimeline.types';
import { tOrLiteral } from '@/shared/i18n/t';

export interface EffectCardProps {
    effect: EffectDefinition;
    onSelect: () => void;
}

export function EffectCard(props: EffectCardProps) {
    let demoEl: HTMLDivElement | undefined;
    let cleanup: (() => void) | undefined;
    // Task 10 (perf/scale): `applyAnimationTimeline` is now async (it lazy-loads gsap on demand
    // instead of every page — including this admin-only Inspector — shipping it unconditionally).
    // `generation` guards the same race `useNodeAnimation.ts`'s `cancelled` flag guards for a
    // single mount: a fast mouse can fire pointerenter/pointerleave/pointerenter again before the
    // FIRST preview's dynamic import even resolves. Bumped on every `stopPreview()` (including the
    // one `startPreview()` itself calls first) so a stale resolution can tell it's no longer the
    // active preview and revert itself immediately instead of overwriting a newer `cleanup` (or
    // leaking a `gsap.context()` nothing ever tears down).
    let generation = 0;

    // applyAnimationTimeline's GSAP path returns `() => ctx.revert()`, which reverts every
    // inline style the tween wrote — so stopping a preview needs nothing beyond calling it.
    // Its reduced-motion path, by contrast, synchronously writes the effect's FINAL state and
    // returns a no-op cleanup: for an admin with `prefers-reduced-motion: reduce`, this card's
    // demo box simply lands on the effect's end state at the first hover and stays there,
    // exactly like every animated node on the real canvas does for that same admin. That is
    // intentional — force-clearing the demo box's transform here would fight the engine's
    // deliberate accessibility behavior and make this card the one place in the app that
    // re-animates for someone who asked for no motion. So: call cleanup, and nothing else.
    const stopPreview = () => {
        generation++;
        cleanup?.();
        cleanup = undefined;
    };

    const startPreview = () => {
        if (!demoEl) return;
        // Always tear down any in-flight preview first. A fast mouse can produce a second
        // pointerenter before the matching pointerleave (or before the 0.6–0.8s tween ends),
        // and stacking two gsap.context()s over the same element would leak the first one.
        stopPreview();
        const myGeneration = generation;
        applyAnimationTimeline(demoEl, {
            keyframes: [{ id: 'preview', ...props.effect.preview }],
            trigger: EAnimationTrigger.ON_LOAD,
            // Valid + harmless for a picker preview: `mobileEnabled` only gates the <768px
            // viewport check inside the engine, which must never suppress the Inspector's own
            // demo box (the Inspector is a desktop-admin surface, and a suppressed preview
            // would read as a broken card rather than as a deliberate mobile optimisation).
            mobileEnabled: true,
        }).then((c) => {
            if (myGeneration !== generation) {
                // Superseded by a later stopPreview()/startPreview() while this was in flight —
                // revert immediately instead of stashing it as the active cleanup.
                c();
                return;
            }
            cleanup = c;
        });
    };

    onCleanup(stopPreview);

    return (
        <div
            role="button"
            tabIndex={0}
            class="flex cursor-pointer flex-col items-center gap-1.5 rounded-nb border border-nb-border bg-nb-bg-subtle p-2.5 text-center transition-colors hover:border-nb-accent"
            onPointerEnter={startPreview}
            onPointerLeave={stopPreview}
            // Keyboard users get the same preview as mouse users — focus/blur mirror
            // pointerenter/pointerleave through the exact same start/stop pair.
            onFocus={startPreview}
            onBlur={stopPreview}
            onClick={() => props.onSelect()}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    // Space would otherwise scroll the Inspector panel under the card.
                    e.preventDefault();
                    props.onSelect();
                }
            }}
        >
            <div class="flex h-8 w-full items-center justify-center overflow-hidden">
                <div data-testid="effect-card-demo" ref={demoEl} class="h-6 w-6 rounded-sm bg-nb-accent/60" />
            </div>
            <Icon name={props.effect.icon} class="h-4 w-4 text-nb-text-muted" />
            <span class="text-xs font-medium text-nb-text">{tOrLiteral(props.effect.name)}</span>
            <span class="text-[10px] leading-tight text-nb-text-muted">{tOrLiteral(props.effect.description)}</span>
        </div>
    );
}
