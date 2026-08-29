// src/modules/cms/node/imageOnlyStyleKeys.ts
//
// CSS properties `applyNodeStyle()` can emit that are only meaningful on an `<img>` element
// itself, not on the wrapping `<div>` `ImageNode.tsx` renders around it. Shared between
// `ImageNode.tsx` (which routes its OWN base-style properties between wrapper/img using this set)
// and `compileNodeStateCss.ts` (final-review fix C-1: a compiled hover/focus/active override that
// touches one of these — chiefly `filter`, see the long comment on that in `ImageNode.tsx` — must
// ALSO reach the `<img>`, not just the wrapper the base selector `[data-node-id="ID"] > *`
// targets, or the override is silently inert on exactly this property).
//
// Previously this lived as a private `IMG_ONLY_KEYS` constant inside `ImageNode.tsx` only.
// Hoisted here so the generic, node-type-agnostic `compileNodeStateCss.ts` compiler doesn't need
// to import from — or duplicate — a specific primitive component's internals to know which
// properties need the extra img-targeted selector.
export const IMAGE_ONLY_CSS_KEYS = new Set(['object-fit', 'object-position', 'filter']);
