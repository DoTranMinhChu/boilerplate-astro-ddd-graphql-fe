//
// Property Inspector redesign, Phase 2 — single source of truth for the animation-preset
// "quick effects" the picker shows as visual cards (EffectCard/EffectPicker,
// src/modules/cms/admin/nodeBuilder/) AND for what gets written into a node's
// AnimationTimeline when one is picked. Replaces NodeAnimationTab.tsx's old local
// `QUICK_PRESETS` array (same 7 presets, same keyframe values — only the packaging changed,
// nothing about the resulting AnimationKeyframe shape).
import type { AnimationKeyframe } from './animationTimeline.types';
import { EAnimationTrigger, EAnimationProperty } from './animationTimeline.types';

export interface EffectDefinition {
    id: string;
    /** i18n key */
    name: string;
    /** i18n key, one short sentence */
    description: string;
    /** iconify string, e.g. 'heroicons-outline:arrow-up' */
    icon: string;
    /** Keyframe applied to the real node when the user picks this effect. */
    defaults: Omit<AnimationKeyframe, 'id'>;
    /** Keyframe played on the picker card's own demo element on hover. Identical to `defaults`
     * for every effect except `cardStagger` (see below) — kept as a separate field so a future
     * phase can tune a faster/looping preview without touching the real applied effect. */
    preview: Omit<AnimationKeyframe, 'id'>;
    /** Informational only for now — `AnimationTimeline.trigger` is set once for the WHOLE
     * timeline, not per-keyframe, so this does not gate anything at runtime yet. Documents which
     * trigger this effect was designed for; available for a future phase to filter the picker by
     * the timeline's current trigger without a type change then. */
    supportedTriggers: EAnimationTrigger[];
}

export const EFFECT_REGISTRY: EffectDefinition[] = [
    {
        id: 'fadeIn',
        name: 'cms.node.animation.presetFadeIn',
        description: 'cms.node.animation.presetFadeInDesc',
        icon: 'heroicons-outline:eye',
        defaults: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.8 },
        preview: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.8 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'fadeUp',
        name: 'cms.node.animation.presetFadeUp',
        description: 'cms.node.animation.presetFadeUpDesc',
        icon: 'heroicons-outline:arrow-up',
        defaults: { property: EAnimationProperty.Y, from: 32, to: 0, duration: 0.8 },
        preview: { property: EAnimationProperty.Y, from: 32, to: 0, duration: 0.8 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'slideLeft',
        name: 'cms.node.animation.presetSlideLeft',
        description: 'cms.node.animation.presetSlideLeftDesc',
        icon: 'heroicons-outline:arrow-left',
        defaults: { property: EAnimationProperty.X, from: 48, to: 0, duration: 0.8 },
        preview: { property: EAnimationProperty.X, from: 48, to: 0, duration: 0.8 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'scaleIn',
        name: 'cms.node.animation.presetScaleIn',
        description: 'cms.node.animation.presetScaleInDesc',
        icon: 'heroicons-outline:arrows-pointing-out',
        defaults: { property: EAnimationProperty.SCALE, from: 0.9, to: 1, duration: 0.8 },
        preview: { property: EAnimationProperty.SCALE, from: 0.9, to: 1, duration: 0.8 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'headingReveal',
        name: 'cms.node.animation.presetHeadingReveal',
        description: 'cms.node.animation.presetHeadingRevealDesc',
        icon: 'heroicons-outline:bars-3-bottom-left',
        defaults: { property: EAnimationProperty.Y, from: 30, to: 0, duration: 0.7 },
        preview: { property: EAnimationProperty.Y, from: 30, to: 0, duration: 0.7 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'bodyReveal',
        name: 'cms.node.animation.presetBodyReveal',
        description: 'cms.node.animation.presetBodyRevealDesc',
        icon: 'heroicons-outline:document-text',
        defaults: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.6, delay: 0.1 },
        preview: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.6, delay: 0.1 },
        supportedTriggers: [EAnimationTrigger.ON_LOAD, EAnimationTrigger.ON_SCROLL],
    },
    {
        id: 'cardStagger',
        name: 'cms.node.animation.presetCardStagger',
        description: 'cms.node.animation.presetCardStaggerDesc',
        icon: 'heroicons-outline:squares-2x2',
        defaults: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.6, stagger: 0.08 },
        // The picker's demo element has no siblings to stagger inside a tiny card, so the
        // preview keyframe drops `stagger` — same fade-in motion, visually representative of
        // "cards appearing one after another" without the multi-element requirement.
        preview: { property: EAnimationProperty.OPACITY, from: 0, to: 1, duration: 0.6 },
        supportedTriggers: [EAnimationTrigger.ON_SCROLL],
    },
];
