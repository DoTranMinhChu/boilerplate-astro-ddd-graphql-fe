// src/modules/cms/cms.constants.ts
//
// Central definitions for every enum-like value used across the CMS module.
// Import the const object instead of retyping the string literal: a typo
// becomes a compile error instead of a silent runtime mismatch, and renaming
// a value only touches one place.
//
// These are plain `as const` objects (not TS `enum`) because the values are
// also what's stored verbatim in JSONB columns — a real TS `enum` would add
// a runtime object with numeric reverse-mappings we don't want serialized.
// `EFoo.BAR` still gives full autocomplete + type safety.
//
// (Motion System Unification, Task 11: `EAnimationPreset`/`EAnimationSpeed` — the
// legacy preset-animation enums — deleted here; no enum-like value currently
// remains in the CMS module, but this file stays as the place to add the next one.)
