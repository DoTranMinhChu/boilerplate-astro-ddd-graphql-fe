# No-code color system upgrade: group toggles, RGBA, media-fill text — Design

**Status:** Approved by user in chat (2026-08-20). Written for the record and to seed the implementation plan; formal "review the spec file" round-trip skipped per explicit user instruction ("Code cho tôi mọi thứ tốt rồi đấy").

## Problem

Three related complaints from the user about the Node Builder's style controls (`NodeStyleTab.tsx` / `ColorControl.tsx` / `ColorPickerField.tsx`):

1. Every color-bearing style group (Nền/Background, Viền/Border) always shows a pre-filled default color in the Inspector, with no visible "this is OFF" state — even though the underlying data model mostly already supports "unset" (e.g. `applyNodeStyle.ts`'s border branch already renders nothing when `color` is missing), the UI gives no confident way to reach or see that state.
2. The color picker (`ColorPickerField.tsx`, built on `solid-colorful`'s `HexColorPicker`/`HexColorInput`) is hex-only — no alpha/transparency channel at all.
3. Text color (`typography.color`) is a plain solid-color string only. The user wants text that can be filled with an image or a video (the classic "photo/video clipped to text glyphs" look — see their reference screenshots: CAT BOX, TETTA, CREATIVE DESIGN), not just a flat color.

## Current state (verified in code)

- `StyleObject.background` already has `type: 'color'|'gradient'|'image'|'video'`. `applyNodeStyle.ts` implements `color`/`gradient`/`image` fully; `video` is a comment ("xử lý ở component") with **no actual implementation** anywhere in `FrameNode.tsx` — a pre-existing gap this design also closes, since text-video-fill needs the same underlying `<video>`-as-fill capability.
- `StyleObject.border`: `applyNodeStyle.ts` line ~121 already requires **both** `width !== undefined` AND `color` truthy before emitting any `border` CSS — so "no border" already works at the data level. The gap is purely UI: no on/off switch, `ColorControl`'s `defaultValue` fallback makes an unset color look identical to a deliberately-set one.
- `StyleObject.shadow` is an array with its own "Không có" (none) option already wired in `NodeStyleTab.tsx`'s Select — already has a real off-state, **no change needed**.
- `solid-colorful` (existing dependency) ships `RgbaColorPicker` (object-based: `{r,g,b,a}`, alpha 0-1) and `RgbaStringColorPicker` (CSS string-based) out of the box — the alpha slider is built into the picker's own popover UI, no separate slider component needed.

## Design

### 1. Style-group on/off toggle (Background, Border)

Add a switch at the top of `NodeStyleTab.tsx`'s "Nền" and "Viền" `InspectorSection`s. OFF sets `style.background`/`style.border` to `undefined` (deletes the key entirely, not just its sub-fields) — matches `applyNodeStyle`'s existing "key absent → nothing rendered" behavior, so no changes needed there. ON reveals the existing controls (with sensible starting defaults on first toggle-on, e.g. `#000000ff` background / `1px solid #e5e5e5ff` border, same defaults as today).

`HoverStyleOverride.background`/`.border` get the identical toggle in the Hover section for consistency (a hover state can also turn a border fully on/off, not just recolor it).

### 2. RGBA color model (hex8 storage)

Storage format: `#rrggbbaa` (user's explicit choice over `rgba(...)` strings) everywhere a color currently lives — `background.value`, `border.color`, `shadow[].color`, `typography.color` (solid mode, see §3). A new small conversion module (`colorHex8.ts`) provides:

```ts
export function hex8ToRgba(hex: string): { r: number; g: number; b: number; a: number };
export function rgbaToHex8(rgba: { r: number; g: number; b: number; a: number }): string;
```

`hex8ToRgba` accepts both 6-digit (`#rrggbb`, alpha defaults to `1`) and 8-digit input — this is the entire backward-compat story: every color ever saved as plain hex keeps rendering and editing correctly, no DB migration, no format-version flag.

`ColorPickerField.tsx` swaps `HexColorPicker`/`HexColorInput` for `RgbaColorPicker` (object form) wired through the two conversion functions, plus a plain hex8 text `<input>` (regex `/^#?[0-9a-f]{8}$/i`, matching the existing manual-entry pattern used elsewhere in this codebase) replacing `HexColorInput` (which is hex6-only and would reject/mangle alpha). `ColorControl.tsx`'s public props (`value?: string`, `onChange: (v: string | undefined) => void`) are unchanged — hex8 is still just a `string`, so every existing call site keeps compiling with zero changes.

### 3. Typography color as a union (solid / image / gradient / video)

```ts
typography?: {
    // ...unchanged fields (fontFamily, size, weight, align, ...)
    color?: { type: 'solid' | 'image' | 'gradient' | 'video'; value: string };
};
```

Breaking change from today's `color?: string` — acceptable per user's explicit request; `TextNode.tsx` and `applyNodeStyle.ts`'s typography branch are the only two read sites, both updated together. `HoverStyleOverride.typography` mirrors the same union (currently `Pick<..., 'color'>` where `color` was `string` — becomes `Pick<..., 'color'>` where `color` is the new union type, no structural change to the `Pick`).

`applyNodeStyle.ts` rendering:
- `solid` → `css.color = value` (hex8 — alpha now genuinely usable on solid text color too, e.g. a soft 60%-opacity caption).
- `image` / `gradient` → `css['background-image'] = type === 'image' ? \`url(${value})\` : value`, `css['background-clip'] = 'text'`, `css['-webkit-background-clip'] = 'text'`, `css.color = 'transparent'`. Works with `applyNodeStyle`'s existing inline-style output — no component change needed, wrapping/multi-line text handled natively by the browser exactly like today's plain text.
- `video` → cannot be expressed as inline CSS at all (a `<video>` element isn't a valid `background-image` source) — handled entirely in `TextNode.tsx`, see §4.

### 4. Video-as-text-fill

Scoped to **short, single-line headline-style text** (matches the user's own reference images — CAT BOX / TETTA / CREATIVE DESIGN are all short headlines, not paragraphs). Multi-line dynamic text reliably mirrored into an SVG mask is a much harder problem not worth solving here; `image`/`gradient` fills have no such limit since they use native `background-clip: text`.

Technique (the standard "video-filled text" trick): when `typography.color.type === 'video'`, `TextNode.tsx` renders:
1. An `<svg>` `<mask>` containing an `<text>` element with the SAME content/font-family/font-size/font-weight as the node (read from the same `typography` fields already on the node, so they can't drift independently).
2. A `<video autoplay muted loop playsinline src={value}>` positioned to fill the text's bounding box, with `mask: url(#<generated-id>)` (`-webkit-mask` fallback) referencing that SVG mask.
3. No visible fallback text node in the DOM for accessibility purposes beyond the video's own content being purely decorative — the node's plain-text content is still present as an `aria-label`/visually-hidden equivalent so screen readers get the real string instead of nothing.

This is the one genuinely new piece of DOM (previously `TextNode.tsx` was a single `<p>`); it's conditional on `type === 'video'` only — every other mode (including `image`/`gradient`) keeps today's single-`<p>` output byte-for-byte.

### Pre-existing gap closed as a side effect

`FrameNode.tsx`'s `background.type === 'video'` was documented as "handled at component level" but had no actual implementation. Since text-video-fill needs the exact same `<video>`-as-fill machinery, `FrameNode.tsx` gains real video-background support in the same pass (an absolutely-positioned `<video>` layer behind `NodeChildrenList`, sized via the same `position`/`size` fields background-image already reads) — closing a bug that predates this feature, using code this feature needs to write anyway.

## Testing

- `colorHex8.test.ts`: round-trip hex6→rgba→hex8, hex8→rgba→hex8, alpha boundary values (0, 1, fractional), invalid-input fallback.
- `applyNodeStyle.test.ts`: new cases for `typography.color` solid/image/gradient (CSS output), border/background fully absent when key is `undefined` (regression guard for the toggle's "delete the key" contract).
- `applyNodeHoverStyle.test.ts`: hover border/background toggle-off (no CSS emitted), hover typography.color non-solid modes.
- `ColorPickerField.test.tsx` (new or extended existing): renders alpha slider, hex8 input round-trips, backward-compat reads a plain 6-digit hex value correctly.
- `NodeStyleTab.test.tsx`: background/border toggle switch on/off behavior (mount with unset → OFF state shown; toggling ON writes sensible defaults; toggling OFF deletes the key, not just clears sub-fields).
- `TextNode.test.tsx` (new): solid/image/gradient render the right inline style; video mode renders the `<video>` + `<svg><mask>` pair and an accessible text equivalent.
- `FrameNode.test.tsx`: new video-background case.

## Out of scope

- Migrating existing saved hex6 colors to hex8 in the database — not needed, read-side conversion handles it.
- Video-fill for wrapping/multi-line text.
- A generic "any style group can be toggled" mechanism — only Background and Border get the switch (Shadow already has one; Spacing/Size/Typography/Effects/Transform have natural zero-effect defaults and don't need one).
