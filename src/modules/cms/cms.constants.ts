// src/modules/cms/cms.constants.ts
//
// Central definitions for every enum-like value used across the CMS module —
// currently just animation presets/speeds. Import the const object instead
// of retyping the string literal: a typo becomes a compile error instead of a
// silent runtime mismatch, and renaming a value only touches one place.
//
// These are plain `as const` objects (not TS `enum`) because the values are
// also what's stored verbatim in JSONB columns (e.g. Node.animation) — a real
// TS `enum` would add a runtime object with numeric reverse-mappings we don't
// want serialized. `EFoo.BAR` still gives full autocomplete + type safety.

export const EAnimationSpeed = { SLOW: 'slow', MEDIUM: 'medium', FAST: 'fast' } as const;
export type EAnimationSpeed = (typeof EAnimationSpeed)[keyof typeof EAnimationSpeed];

export const EAnimationPreset = {
    NONE: 'none',
    FADE_IN: 'fade-in',
    FADE_UP: 'fade-up',
    FADE_DOWN: 'fade-down',
    SLIDE_LEFT: 'slide-left',
    SLIDE_RIGHT: 'slide-right',
    SCALE_IN: 'scale-in',
    TEXT_REVEAL: 'text-reveal',
    STAGGER_CHILDREN: 'stagger-children',
} as const;
export type EAnimationPreset = (typeof EAnimationPreset)[keyof typeof EAnimationPreset];
