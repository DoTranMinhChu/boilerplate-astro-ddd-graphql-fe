# No-code color system upgrade: group toggles, RGBA (hex8), media-fill text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Node Builder admins (1) turn Background/Border fully off instead of always seeing a forced default color, (2) pick colors with a real alpha/transparency channel (stored as `#rrggbbaa`), and (3) fill text with an image or video clipped to the glyph shapes, not just a flat color.

**Architecture:** All three changes live on the existing `StyleObject` → `applyNodeStyle()` → inline-`style=` pipeline (`src/modules/cms/node/`). Background/Border toggles are pure Inspector UI (the "absent key" contract already works end-to-end). RGBA swaps `solid-colorful`'s `HexColorPicker` for its `RgbaColorPicker`, storing hex8 strings everywhere a color already lives — no new field, no migration. Text media-fill turns `typography.color` from a plain `string` into a `{type, value}` union rendered via `background-clip: text` (image/gradient) or an SVG-masked `<video>` (video, scoped to single-line headline text). Frame's `background.type === 'video'` — documented but never implemented — gets built in the same pass since text-video-fill needs the identical `<video>`-as-fill machinery.

**Tech Stack:** SolidJS, `solid-colorful` (existing dependency — `RgbaColorPicker` is already in the package, CSS for its alpha slider is already vendored in `colorPicker.css`), Vitest + `@solidjs/testing-library`.

## Global Constraints

- Color storage format is `#rrggbbaa` (8-digit hex) everywhere — user's explicit choice over `rgba(...)` strings (see spec §2).
- Old 6-digit hex values (`#rrggbb`) must keep reading/editing correctly forever — no DB migration, alpha defaults to `ff` (opaque) when absent.
- Background/Border toggle-off deletes the **entire** group key (`style.background = undefined`, not sub-fields) — matches `applyNodeStyle.ts`'s existing "key absent → nothing rendered" contract.
- Video-as-text-fill is scoped to single-line headline text only (no dynamic multi-line SVG-mask re-wrapping) — spec §4.
- `typography.color: string` → `typography.color: { type: 'solid'|'image'|'gradient'|'video'; value: string }` is an intentional breaking change to that one field — every read/write site and every test fixture using the old shape must be updated in the same task that changes the type, so the branch never sits in a half-migrated state.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/core/components/control/colorHex8.ts` (new) | `hex6/hex8 string ⇄ {r,g,b,a} object` conversion — the one place format-handling logic lives. |
| `src/core/components/control/colorHex8.test.ts` (new) | Round-trip + backward-compat tests for the above. |
| `src/modules/cms/admin/builder/ColorPickerField.tsx` (modify) | Popover swaps `HexColorPicker`/`HexColorInput` → `RgbaColorPicker` + a hex8 text input, via `colorHex8.ts`. |
| `src/modules/cms/admin/builder/ColorPickerField.test.tsx` (new) | Alpha slider present, hex8 round-trip, 6-digit backward compat. |
| `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx` (modify) | Background/Border on/off `Checkbox` toggles (main + hover sections); new `TypographyColorControl` wired into the Chữ + Hover sections. |
| `src/modules/cms/admin/nodeBuilder/TypographyColorControl.tsx` (new) | Type selector (Solid/Ảnh/Gradient/Video) + the matching sub-field (color picker, or URL/gradient text input), plus its own on/off toggle. |
| `src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx` (new) | Mode switching, on/off toggle, per-mode field wiring. |
| `src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx` (modify) | New cases for the Background/Border toggles. |
| `src/modules/cms/node/node.types.ts` (modify) | `typography.color` becomes the new union type. |
| `src/modules/cms/node/applyNodeStyle.ts` (modify) | Typography branch renders solid/image/gradient (video → component-only, emits nothing). |
| `src/modules/cms/node/applyNodeStyle.test.ts` (modify) | Update the 6 existing fixtures using the old plain-string `typography.color` shape; add new solid/image/gradient/video cases. |
| `src/modules/cms/node/applyNodeHoverStyle.test.ts` (modify) | Update the one fixture using the old plain-string shape. |
| `src/modules/cms/node/primitives/TextNode.tsx` (modify) | Video mode renders an SVG `<mask>` + `<video>` pair instead of the plain `<p>`; solid/image/gradient keep the single-`<p>` output (works automatically via `applyNodeStyle`, no code change needed for those three modes). |
| `src/modules/cms/node/primitives/TextNode.test.tsx` (new) | Solid/image/gradient render the right inline style; video renders the mask+video pair with an accessible text equivalent. |
| `src/modules/cms/node/primitives/FrameNode.tsx` (modify) | Closes the pre-existing gap: `background.type === 'video'` renders a real absolutely-positioned `<video>` layer. |
| `src/modules/cms/node/primitives/FrameNode.test.tsx` (new — confirmed this primitive has no test file yet) | Video-background case. |
| `src/modules/cms/cms.i18n.ts` (modify) | New vi+en key pairs for every new label. |

---

### Task 1: `colorHex8.ts` — hex6/hex8 ⇄ RGBA conversion

**Files:**
- Create: `src/core/components/control/colorHex8.ts`
- Test: `src/core/components/control/colorHex8.test.ts`

**Interfaces:**
- Produces: `hex8ToRgba(hex: string): { r: number; g: number; b: number; a: number }` (accepts `#rrggbb` or `#rrggbbaa`, with or without leading `#`; malformed input falls back to opaque black `{r:0,g:0,b:0,a:1}`). `rgbaToHex8(rgba: { r: number; g: number; b: number; a: number }): string` (always returns lowercase `#rrggbbaa`, clamping each channel to its valid range).

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/components/control/colorHex8.test.ts
import { describe, it, expect } from 'vitest';
import { hex8ToRgba, rgbaToHex8 } from './colorHex8';

describe('hex8ToRgba', () => {
    it('parses an 8-digit hex string into {r,g,b,a} with alpha 0-1', () => {
        expect(hex8ToRgba('#d4a62bcc')).toEqual({ r: 212, g: 166, b: 43, a: 0.8 });
    });

    it('parses a plain 6-digit hex string, defaulting alpha to 1 (backward compat with pre-RGBA data)', () => {
        expect(hex8ToRgba('#171717')).toEqual({ r: 23, g: 23, b: 23, a: 1 });
    });

    it('accepts input with no leading #', () => {
        expect(hex8ToRgba('ffffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('is case-insensitive', () => {
        expect(hex8ToRgba('#D4A62BCC')).toEqual({ r: 212, g: 166, b: 43, a: 0.8 });
    });

    it('falls back to opaque black for malformed input rather than throwing', () => {
        expect(hex8ToRgba('not-a-color')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        expect(hex8ToRgba('')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        expect(hex8ToRgba(undefined as unknown as string)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
});

describe('rgbaToHex8', () => {
    it('formats {r,g,b,a} into a lowercase 8-digit hex string', () => {
        expect(rgbaToHex8({ r: 212, g: 166, b: 43, a: 0.8 })).toBe('#d4a62bcc');
    });

    it('formats fully opaque alpha as "ff"', () => {
        expect(rgbaToHex8({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000ff');
    });

    it('formats fully transparent alpha as "00"', () => {
        expect(rgbaToHex8({ r: 255, g: 255, b: 255, a: 0 })).toBe('#ffffff00');
    });

    it('round-trips through hex8ToRgba', () => {
        const original = '#3a7bd5e6';
        expect(rgbaToHex8(hex8ToRgba(original))).toBe(original);
    });

    it('clamps out-of-range channel values instead of producing invalid hex', () => {
        expect(rgbaToHex8({ r: 300, g: -10, b: 128, a: 1.5 })).toBe('#ff0080ff');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/components/control/colorHex8.test.ts`
Expected: FAIL — `Cannot find module './colorHex8'`

- [ ] **Step 3: Write the implementation**

```ts
// src/core/components/control/colorHex8.ts
export interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const clampAlpha = (n: number) => Math.max(0, Math.min(1, n));
const toHexByte = (n: number) => clampByte(n).toString(16).padStart(2, '0');

/** Accepts `#rrggbb` or `#rrggbbaa` (leading `#` optional, case-insensitive). A 6-digit
 * value defaults alpha to `1` (opaque) — this is the entire backward-compat story for
 * every color ever saved before this RGBA upgrade shipped: it keeps rendering and
 * editing correctly with zero data migration. Malformed input falls back to opaque
 * black rather than throwing, matching this codebase's other color-parsing helpers
 * (see `ColorPickerField.tsx`'s `luminance()`). */
export function hex8ToRgba(hex: string): RgbaColor {
    const clean = (hex ?? '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{8}$/i.test(clean)) {
        return {
            r: parseInt(clean.slice(0, 2), 16),
            g: parseInt(clean.slice(2, 4), 16),
            b: parseInt(clean.slice(4, 6), 16),
            a: parseInt(clean.slice(6, 8), 16) / 255,
        };
    }
    if (/^[0-9a-f]{6}$/i.test(clean)) {
        return {
            r: parseInt(clean.slice(0, 2), 16),
            g: parseInt(clean.slice(2, 4), 16),
            b: parseInt(clean.slice(4, 6), 16),
            a: 1,
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
}

/** Always returns a lowercase `#rrggbbaa` string, clamping out-of-range input rather
 * than producing an invalid hex string (defensive — `RgbaColorPicker` shouldn't ever
 * hand back an out-of-range value, but a clamp here is cheap insurance). */
export function rgbaToHex8(rgba: RgbaColor): string {
    return `#${toHexByte(rgba.r)}${toHexByte(rgba.g)}${toHexByte(rgba.b)}${toHexByte(Math.round(clampAlpha(rgba.a) * 255))}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/core/components/control/colorHex8.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/components/control/colorHex8.ts src/core/components/control/colorHex8.test.ts
git commit -m "feat(color): add hex8<->rgba conversion helpers for the RGBA color picker upgrade"
```

---

### Task 2: RGBA color picker (`ColorPickerField.tsx`)

**Files:**
- Modify: `src/modules/cms/admin/builder/ColorPickerField.tsx`
- Test: `src/modules/cms/admin/builder/ColorPickerField.test.tsx`

**Interfaces:**
- Consumes: `hex8ToRgba`/`rgbaToHex8` from Task 1 (`src/core/components/control/colorHex8.ts`).
- Produces: `ColorPickerField`'s public props (`label`, `value?: string`, `defaultValue: string`, `onChange: (value: string | undefined) => void`, `swatchOnly?: boolean`) are **unchanged** — every existing call site (`ColorControl.tsx`, and therefore every `NodeStyleTab.tsx` usage) keeps compiling with zero changes. The `value`/`defaultValue`/emitted strings are now expected to be hex8, but a plain hex6 string still works via `hex8ToRgba`'s backward-compat parsing.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/modules/cms/admin/builder/ColorPickerField.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ColorPickerField } from './ColorPickerField';

describe('ColorPickerField — RGBA upgrade', () => {
    it('opens a popover containing an alpha slider (solid-colorful renders it as .react-colorful__alpha)', () => {
        const { getByRole, container } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        fireEvent.click(getByRole('button'));
        expect(container.querySelector('.react-colorful__alpha')).toBeTruthy();
    });

    it('shows the current hex8 value (including alpha) in the trigger button', () => {
        const { getByText } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        expect(getByText('#d4a62bcc')).toBeTruthy();
    });

    it('renders an editable hex8 text input inside the open popover, seeded with the current value', () => {
        const { getByRole, getByDisplayValue } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        fireEvent.click(getByRole('button'));
        expect(getByDisplayValue('#d4a62bcc')).toBeTruthy();
    });

    it('calls onChange with a hex8 string when the hex text input changes', async () => {
        const onChange = vi.fn();
        const { getByRole, getByDisplayValue } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={onChange} />
        ));
        fireEvent.click(getByRole('button'));
        const input = getByDisplayValue('#d4a62bcc') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: '#00ff0080' } });
        expect(onChange).toHaveBeenCalledWith('#00ff0080');
    });

    it('backward compat: a plain 6-digit hex value (pre-RGBA data) still displays and round-trips correctly', () => {
        const { getByText } = render(() => (
            <ColorPickerField label="Nền" value="#171717" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        // Displayed verbatim (not force-upgraded to hex8) — editing it through the picker
        // is what produces a hex8 value going forward, matching the spec's "no migration" contract.
        expect(getByText('#171717')).toBeTruthy();
    });

    it('the reset button still clears to undefined', () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={onChange} />
        ));
        fireEvent.click(getByRole('button'));
        fireEvent.click(getByText('Đặt lại'));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/admin/builder/ColorPickerField.test.tsx`
Expected: FAIL — no `.react-colorful__alpha` element (current picker is hex-only, no alpha slider), and no hex8 text input exists yet in the popover.

Note: check `t('cms.builder.style.resetButton')`'s current vi string before running — if it isn't literally `'Đặt lại'`, use the actual current value in the last test instead (`grep -n "resetButton" src/modules/cms/cms.i18n.ts` or wherever that key lives).

- [ ] **Step 3: Write the implementation**

```tsx
// src/modules/cms/admin/builder/ColorPickerField.tsx
import { createSignal, Show } from 'solid-js';
import { RgbaColorPicker } from 'solid-colorful';
import './colorPicker.css';
import { t } from '@/shared/i18n/t';
import { hex8ToRgba, rgbaToHex8 } from '@core/components/control/colorHex8';

/** Relative luminance (WCAG) — used only for the non-blocking contrast hint below.
 * Reads only the rgb channels (alpha doesn't affect the hint), so this keeps working
 * unchanged for both hex6 and hex8 input via `hex8ToRgba`. */
function luminance(hex: string): number | null {
    if (!/^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex.trim())) return null;
    const { r, g, b } = hex8ToRgba(hex);
    const lin = (c: number) => ((c / 255 <= 0.03928) ? (c / 255) / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Non-blocking low-contrast hint — WCAG contrast ratio < 3 between two hex colors. */
export function isLowContrast(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    const la = luminance(a);
    const lb = luminance(b);
    if (la === null || lb === null) return false;
    const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    return ratio < 3;
}

export interface ColorPickerFieldProps {
    label: string;
    value?: string;
    defaultValue: string;
    onChange: (value: string | undefined) => void;
    /** Renders the trigger as a bare swatch circle with no border/padding/hex
     * text — for composition inside a row that already shows the hex value
     * itself (e.g. `ColorControl`), so the value isn't displayed twice. */
    swatchOnly?: boolean;
}

const HEX8_RE = /^#?[0-9a-f]{8}$/i;

/** No-code RGBA color picker (accent/text/background in Page Builder's Style tab).
 * Popover pattern: a swatch button opens the picker; a hex8 text input lets an admin
 * who already knows a hex+alpha code type it directly instead of dragging the canvas.
 * Stores `#rrggbbaa` — see docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md §2. */
export function ColorPickerField(props: ColorPickerFieldProps) {
    const [open, setOpen] = createSignal(false);
    const [hexDraft, setHexDraft] = createSignal('');
    const color = () => props.value ?? props.defaultValue;

    return (
        <div class="relative">
            <Show when={props.label}>
                <label class="mb-1 block text-xs font-medium text-neutral-500">{props.label}</label>
            </Show>
            <button
                type="button"
                classList={{
                    'flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm hover:border-neutral-300': !props.swatchOnly,
                    'h-4 w-4 shrink-0 rounded-full border border-black/10': !!props.swatchOnly,
                }}
                style={props.swatchOnly ? { 'background-color': color() } : undefined}
                onClick={() => {
                    setHexDraft(color());
                    setOpen((v) => !v);
                }}
            >
                <Show when={!props.swatchOnly}>
                    <span class="h-4 w-4 rounded-full border border-black/10" style={{ 'background-color': color() }} />
                    <span class="font-mono text-xs text-neutral-600">{color()}</span>
                </Show>
            </button>

            <Show when={open()}>
                <div class="absolute z-30 mt-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                    <RgbaColorPicker color={hex8ToRgba(color())} onChange={(rgba) => props.onChange(rgbaToHex8(rgba))} />
                    <input
                        value={hexDraft()}
                        onInput={(e) => {
                            const v = e.currentTarget.value;
                            setHexDraft(v);
                            if (HEX8_RE.test(v)) props.onChange(v.startsWith('#') ? v : `#${v}`);
                        }}
                        class="mt-2 w-full rounded-md border border-neutral-200 px-2 py-1 text-center font-mono text-xs"
                        placeholder="#rrggbbaa"
                        maxLength={9}
                    />
                    <div class="mt-2 flex justify-between gap-2">
                        <button type="button" class="text-xs text-neutral-400 hover:text-neutral-600" onClick={() => props.onChange(undefined)}>
                            {t('cms.builder.style.resetButton')}
                        </button>
                        <button type="button" class="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={() => setOpen(false)}>
                            {t('cms.builder.style.doneButton')}
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/admin/builder/ColorPickerField.test.tsx`
Expected: PASS (6 tests). If the "reset button" test fails on the literal Vietnamese string, replace it with the real current value of `cms.builder.style.resetButton` from `cms.i18n.ts` and re-run.

- [ ] **Step 5: Run the pre-existing `ColorControl.test.tsx` to confirm zero regression**

Run: `npx vitest run src/core/components/control/ColorControl.test.tsx`
Expected: PASS (3 tests, unchanged — `ColorControl`'s own code and API were not touched).

- [ ] **Step 6: Commit**

```bash
git add src/modules/cms/admin/builder/ColorPickerField.tsx src/modules/cms/admin/builder/ColorPickerField.test.tsx
git commit -m "feat(color): swap the hex-only picker for solid-colorful's RgbaColorPicker (alpha slider, hex8 storage)"
```

---

### Task 3: Background/Border on/off toggles

**Files:**
- Modify: `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Consumes: `Checkbox` from `@core/components/control/Checkbox` (existing component, `value: boolean`, `onChange: (v: boolean) => void`, `text?`, `fieldless?` — same one `NodeContainerLayoutTab.tsx`'s wrap toggle already uses).
- Produces: no new exports — this task only changes `NodeStyleTab.tsx`'s JSX and the i18n dictionary.

- [ ] **Step 1: Add i18n keys**

In `src/modules/cms/cms.i18n.ts`, in the **vi** `style` block (around line 694, right after `backgroundValue: 'Giá trị / URL',`):

```ts
                backgroundValue: 'Giá trị / URL',
                backgroundEnabled: 'Bật nền',
```

And in the **vi** `style` block, right after `borderColor: 'Màu viền',` (around line 701):

```ts
                borderColor: 'Màu viền',
                borderEnabled: 'Bật viền',
```

In the **en** `style` block (around line 1751, right after `backgroundValue: 'Value / URL',`):

```ts
                backgroundValue: 'Value / URL',
                backgroundEnabled: 'Enable background',
```

And right after `borderColor: 'Color',` in the **en** border group (around line 1758):

```ts
                borderColor: 'Color',
                borderEnabled: 'Enable border',
```

- [ ] **Step 2: Write the failing tests**

```tsx
// Append to src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx
describe('NodeStyleTab — Background/Border on/off toggle (color system upgrade, 2026-08-20)', () => {
    it('shows the Background toggle OFF and hides its controls when style.background is unset', () => {
        const { getByText, queryByText } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(getByText('Bật nền')).toBeTruthy();
        expect(queryByText('Giá trị / URL')).toBeNull();
    });

    it('shows the Background toggle ON and its controls when style.background is set', () => {
        const { getByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'color', value: '#ffffffff' } }} onChange={vi.fn()} />
        ));
        expect(getByText('Giá trị / URL')).toBeTruthy();
    });

    it('turning the Background toggle ON writes a starter background object', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        fireEvent.click(getByText('Bật nền'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ background: { type: 'color', value: '#ffffffff' } }));
    });

    it('turning the Background toggle OFF deletes the whole background key (not just its sub-fields)', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'color', value: '#123456ff' } }} onChange={onChange} />
        ));
        fireEvent.click(getByText('Bật nền'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ background: undefined }));
    });

    it('shows the Border toggle OFF and hides its controls when style.border is unset', () => {
        const { getByText, queryByText } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(getByText('Bật viền')).toBeTruthy();
        expect(queryByText('Bo góc (px)')).toBeNull();
    });

    it('turning the Border toggle ON writes a starter border object', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        fireEvent.click(getByText('Bật viền'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ border: { width: 1, style: 'solid', color: '#e5e5e5ff' } }));
    });

    it('turning the Border toggle OFF deletes the whole border key', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab style={{ border: { width: 2, style: 'solid', color: '#000000ff' } }} onChange={onChange} />
        ));
        fireEvent.click(getByText('Bật viền'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ border: undefined }));
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx`
Expected: FAIL — `getByText('Bật nền')`/`getByText('Bật viền')` not found (toggle doesn't exist yet).

- [ ] **Step 4: Implement the toggles**

In `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx`, add the `Checkbox` import:

```ts
import { Checkbox } from '@core/components/control/Checkbox';
```

Replace the entire "Nền" `InspectorSection` (currently lines 202-225) with:

```tsx
            <InspectorSection title={t('cms.node.style.background')}>
                <div class="flex flex-col gap-3">
                    <Checkbox
                        value={!!style().background}
                        onChange={(on) => set('background', on ? { type: 'color', value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().background}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.backgroundType')}</label>
                            <Select
                                value={style().background?.type ?? 'color'}
                                onChange={(v) => set('background', { ...style().background, type: v as NonNullable<StyleObject['background']>['type'] })}
                                options={[
                                    { value: 'color', label: t('cms.node.style.backgroundTypeColor') },
                                    { value: 'gradient', label: t('cms.node.style.backgroundTypeGradient') },
                                    { value: 'image', label: t('cms.node.style.backgroundTypeImage') },
                                    { value: 'video', label: t('cms.node.style.backgroundTypeVideo') },
                                ]}
                                fieldless
                            />
                        </div>
                        <ColorControl
                            label={t('cms.node.style.backgroundValue')}
                            value={style().background?.value}
                            defaultValue="#ffffffff"
                            onChange={(v) => set('background', { ...style().background, value: v })}
                        />
                    </Show>
                </div>
            </InspectorSection>
```

Replace the entire "Viền" `InspectorSection` (currently lines 227-269) with:

```tsx
            <InspectorSection title={t('cms.node.style.border')}>
                <div class="flex flex-col gap-3">
                    <Checkbox
                        value={!!style().border}
                        onChange={(on) => set('border', on ? { width: 1, style: 'solid', color: '#e5e5e5ff' } : undefined)}
                        text={t('cms.node.style.borderEnabled')}
                        fieldless
                    />
                    <Show when={style().border}>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.borderWidth')}</label>
                                <InputNumber
                                    nullable
                                    value={style().border?.width ?? null}
                                    onChange={(v) => set('border', { ...style().border, width: v ?? undefined })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.borderStyle')}</label>
                                <Select
                                    value={style().border?.style ?? 'solid'}
                                    onChange={(v) => set('border', { ...style().border, style: v as NonNullable<StyleObject['border']>['style'] })}
                                    options={[
                                        { value: 'solid', label: t('cms.node.style.borderStyleSolid') },
                                        { value: 'dashed', label: t('cms.node.style.borderStyleDashed') },
                                        { value: 'dotted', label: t('cms.node.style.borderStyleDotted') },
                                    ]}
                                    fieldless
                                />
                            </div>
                        </div>
                        <ColorControl
                            label={t('cms.node.style.borderColor')}
                            value={style().border?.color}
                            defaultValue="#e5e5e5ff"
                            onChange={(v) => set('border', { ...style().border, color: v })}
                        />
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.borderRadius')}</label>
                            <InputNumber
                                nullable
                                value={style().border?.radius?.tl ?? null}
                                onChange={(v) => set('border', { ...style().border, radius: v == null ? undefined : { tl: v, tr: v, br: v, bl: v } })}
                                fieldless
                            />
                        </div>
                    </Show>
                </div>
            </InspectorSection>
```

Add the `Show` import from `solid-js` at the top of the file (it isn't imported yet):

```ts
import { Show } from 'solid-js';
```

Apply the identical toggle pattern to the Hover section's background/border `ColorControl`s (lines 400-411 in the original file) — replace with:

```tsx
                    <Checkbox
                        value={!!style().hover?.background}
                        onChange={(on) => setHover('background', on ? { type: 'color', value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().hover?.background}>
                        <ColorControl
                            label={t('cms.node.style.background')}
                            value={style().hover?.background?.value}
                            defaultValue="#ffffffff"
                            onChange={(v) => setHover('background', { ...style().hover?.background, type: 'color', value: v })}
                        />
                    </Show>
                    <Checkbox
                        value={!!style().hover?.border}
                        onChange={(on) => setHover('border', on ? { width: 1, style: 'solid', color: '#e5e5e5ff' } : undefined)}
                        text={t('cms.node.style.borderEnabled')}
                        fieldless
                    />
                    <Show when={style().hover?.border}>
                        <ColorControl
                            label={t('cms.node.style.borderColor')}
                            value={style().hover?.border?.color}
                            defaultValue="#e5e5e5ff"
                            onChange={(v) => setHover('border', { ...style().hover?.border, width: style().hover?.border?.width ?? 1, color: v })}
                        />
                    </Show>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx`
Expected: PASS — all new tests plus every pre-existing test in this file (the file already has 20 passing tests before this task; confirm the count only grows, nothing that passed before now fails).

- [ ] **Step 6: Commit**

```bash
git add src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node-builder): on/off toggle for Background and Border style groups (main + hover)"
```

---

### Task 4: `typography.color` union type (solid/image/gradient/video)

**Files:**
- Modify: `src/modules/cms/node/node.types.ts`
- Modify: `src/modules/cms/node/applyNodeStyle.ts`
- Modify: `src/modules/cms/node/applyNodeStyle.test.ts`
- Modify: `src/modules/cms/node/applyNodeHoverStyle.test.ts`
- Create: `src/modules/cms/admin/nodeBuilder/TypographyColorControl.tsx`
- Create: `src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Produces: `StyleObject['typography']['color']` is now `{ type: 'solid' | 'image' | 'gradient' | 'video'; value: string } | undefined` (was `string | undefined`). `TypographyColorControl(props: { value?: TypographyColor; onChange: (v: TypographyColor | undefined) => void })` where `TypographyColor = NonNullable<StyleObject['typography']>['color']`.
- Consumes (in `TypographyColorControl.tsx`): `ColorControl` (existing, unchanged from Task 2), `Input`/`Select`/`Checkbox` (existing).

- [ ] **Step 1: Change the type in `node.types.ts`**

In `src/modules/cms/node/node.types.ts`, replace the `typography` line (currently line 25):

```ts
    typography?: { fontFamily?: string; size?: number; weight?: number; lineHeight?: number; letterSpacing?: number; color?: string; align?: 'left' | 'center' | 'right' | 'justify'; transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; decoration?: 'none' | 'underline' | 'line-through'; maxLines?: number };
```

with:

```ts
    /** `color`'s `{type, value}` shape (2026-08-20 — media-fill text upgrade) lets text be
     * filled with a solid color, an image, a CSS gradient, or a video, all clipped to the
     * glyph shapes — see `applyNodeStyle.ts`'s typography branch and `TextNode.tsx`'s video
     * branch. `value` is a hex8 color for `solid`, a URL for `image`/`video`, or a raw CSS
     * gradient string for `gradient`. */
    typography?: { fontFamily?: string; size?: number; weight?: number; lineHeight?: number; letterSpacing?: number; color?: { type: 'solid' | 'image' | 'gradient' | 'video'; value: string }; align?: 'left' | 'center' | 'right' | 'justify'; transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; decoration?: 'none' | 'underline' | 'line-through'; maxLines?: number };
```

`HoverStyleOverride.typography` (currently line 78, `Pick<NonNullable<StyleObject['typography']>, 'color'>`) needs no edit — it automatically picks up the new union type since it's derived from `StyleObject['typography']` itself.

- [ ] **Step 2: Update `applyNodeStyle.test.ts`'s existing fixtures (they use the old plain-string shape and will not compile/pass once the type changes)**

In `src/modules/cms/node/applyNodeStyle.test.ts`, in the `'maps typography fields to their CSS equivalents'` test (line 26), change:

```ts
        const css = applyNodeStyle({ typography: { fontFamily: 'Inter', size: 18, weight: 600, lineHeight: 1.5, letterSpacing: 0.2, color: '#111', align: 'center', transform: 'uppercase', decoration: 'underline' } });
```

to:

```ts
        const css = applyNodeStyle({ typography: { fontFamily: 'Inter', size: 18, weight: 600, lineHeight: 1.5, letterSpacing: 0.2, color: { type: 'solid', value: '#111' }, align: 'center', transform: 'uppercase', decoration: 'underline' } });
```

(the `expect(css.color).toBe('#111')` assertion right after it stays exactly as-is — solid mode still emits the raw value into `css.color`).

In the 4 responsive-override tests further down (currently lines 112-130), change every `typography: { color: '#111' ... }` / `typography: { color: '#222' } }` to the new shape:

```ts
    it('applies no override when responsiveOverrides/breakpoint are omitted (2 legacy overloads stay identical)', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' } } };
        expect(applyNodeStyle(style)).toEqual(applyNodeStyle(style, undefined, 'desktop'));
    });

    it('merges only the tablet override at breakpoint "tablet"', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' }, size: 16 } };
        const overrides = { tablet: { style: { typography: { size: 20 } } }, mobile: { style: { typography: { size: 12 } } } };
        const css = applyNodeStyle(style, overrides, 'tablet');
        expect(css['font-size']).toBe('20px');
    });

    it('cascades tablet then mobile at breakpoint "mobile" (tablet applies first, mobile can override further)', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' }, size: 16 } };
        const overrides = { tablet: { style: { typography: { color: { type: 'solid' as const, value: '#222' } } } }, mobile: { style: { typography: { size: 12 } } } };
        const css = applyNodeStyle(style, overrides, 'mobile');
        expect(css['font-size']).toBe('12px');
        expect(css.color).toBe('#222'); // tablet's color override still applies at mobile — cascade, not override-only-own-bucket
    });
```

- [ ] **Step 3: Update `applyNodeHoverStyle.test.ts`'s one fixture using the old shape**

In `src/modules/cms/node/applyNodeHoverStyle.test.ts`, change:

```ts
    it('supports a text-color-only hover override (e.g. a muted label brightening on hover)', () => {
        const css = buildHoverCss({ id: 'label-1', parentId: 'card-1', style: { hover: { scope: 'parent', typography: { color: '#f2f2f2' } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="label-1"] > * { color: #f2f2f2 !important; }');
    });
```

to:

```ts
    it('supports a text-color-only hover override (e.g. a muted label brightening on hover)', () => {
        const css = buildHoverCss({ id: 'label-1', parentId: 'card-1', style: { hover: { scope: 'parent', typography: { color: { type: 'solid', value: '#f2f2f2' } } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="label-1"] > * { color: #f2f2f2 !important; }');
    });
```

- [ ] **Step 4: Write new failing tests for the union rendering in `applyNodeStyle.test.ts`**

Append:

```ts
    it('renders typography.color image/gradient modes via background-clip:text', () => {
        const image = applyNodeStyle({ typography: { color: { type: 'image', value: 'https://example.com/photo.jpg' } } });
        expect(image['background-image']).toBe('url(https://example.com/photo.jpg)');
        expect(image['background-clip']).toBe('text');
        expect(image['-webkit-background-clip']).toBe('text');
        expect(image.color).toBe('transparent');

        const gradient = applyNodeStyle({ typography: { color: { type: 'gradient', value: 'linear-gradient(90deg, #f00, #00f)' } } });
        expect(gradient['background-image']).toBe('linear-gradient(90deg, #f00, #00f)');
        expect(gradient['background-clip']).toBe('text');
        expect(gradient.color).toBe('transparent');
    });

    it('emits no inline CSS for typography.color type "video" (TextNode.tsx handles it as a real <video> element instead)', () => {
        const css = applyNodeStyle({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } });
        expect(css.color).toBeUndefined();
        expect(css['background-image']).toBeUndefined();
    });
```

- [ ] **Step 5: Run tests to verify the new ones fail and confirm compile errors on the old ones**

Run: `npx vitest run src/modules/cms/node/applyNodeStyle.test.ts src/modules/cms/node/applyNodeHoverStyle.test.ts`
Expected: type errors / FAIL — `applyNodeStyle.ts`'s typography branch still does `if (t.color) css.color = t.color` (a string assigned to `css.color: string` was fine; now `t.color` is an object and this either fails to typecheck or produces `"[object Object]"`).

- [ ] **Step 6: Update `applyNodeStyle.ts`'s typography branch**

In `src/modules/cms/node/applyNodeStyle.ts`, replace this line (currently line 64):

```ts
        if (t.color) css.color = t.color;
```

with:

```ts
        if (t.color) {
            if (t.color.type === 'solid') {
                css.color = t.color.value;
            } else if (t.color.type === 'image' || t.color.type === 'gradient') {
                css['background-image'] = t.color.type === 'image' ? `url(${t.color.value})` : t.color.value;
                css['background-clip'] = 'text';
                css['-webkit-background-clip'] = 'text';
                css.color = 'transparent';
            }
            // type === 'video': cannot be expressed via inline style at all (a <video> element
            // isn't a valid background-image source) — TextNode.tsx renders the real <video> +
            // SVG mask pair itself when it sees this type, reading `t.color.value` directly.
        }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/node/applyNodeStyle.test.ts src/modules/cms/node/applyNodeHoverStyle.test.ts`
Expected: PASS (all tests in both files, old and new).

- [ ] **Step 8: Add i18n keys**

In `src/modules/cms/cms.i18n.ts`, in the **vi** `style` block, right after `textColor: 'Màu chữ',` (line 681):

```ts
                textColor: 'Màu chữ',
                textColorEnabled: 'Bật màu chữ',
                textColorType: 'Kiểu tô màu chữ',
                textColorTypeSolid: 'Màu đặc',
                textColorTypeImage: 'Hình ảnh',
                textColorTypeGradient: 'Gradient',
                textColorTypeVideo: 'Video',
                textColorImageUrl: 'URL ảnh',
                textColorVideoUrl: 'URL video',
                textColorGradientValue: 'Giá trị gradient (CSS)',
```

In the **en** `style` block, right after `textColor: 'Color',` (line 1738):

```ts
                textColor: 'Color',
                textColorEnabled: 'Enable text color',
                textColorType: 'Fill type',
                textColorTypeSolid: 'Solid',
                textColorTypeImage: 'Image',
                textColorTypeGradient: 'Gradient',
                textColorTypeVideo: 'Video',
                textColorImageUrl: 'Image URL',
                textColorVideoUrl: 'Video URL',
                textColorGradientValue: 'Gradient value (CSS)',
```

- [ ] **Step 9: Write the failing tests for `TypographyColorControl`**

```tsx
// src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { TypographyColorControl } from './TypographyColorControl';

describe('TypographyColorControl', () => {
    it('shows the toggle OFF and hides all fields when value is unset', () => {
        const { getByText, queryByText } = render(() => <TypographyColorControl value={undefined} onChange={vi.fn()} />);
        expect(getByText('Bật màu chữ')).toBeTruthy();
        expect(queryByText('Kiểu tô màu chữ')).toBeNull();
    });

    it('turning the toggle ON writes a starter solid color', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <TypographyColorControl value={undefined} onChange={onChange} />);
        fireEvent.click(getByText('Bật màu chữ'));
        expect(onChange).toHaveBeenCalledWith({ type: 'solid', value: '#171717ff' });
    });

    it('turning the toggle OFF clears the value to undefined', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <TypographyColorControl value={{ type: 'solid', value: '#ffffffff' }} onChange={onChange} />);
        fireEvent.click(getByText('Bật màu chữ'));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('solid mode shows a ColorControl bound to value.value', () => {
        const { getByDisplayValue } = render(() => (
            <TypographyColorControl value={{ type: 'solid', value: '#d4a62bff' }} onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('#d4a62bff')).toBeTruthy();
    });

    it('image mode shows a URL text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'image', value: 'https://example.com/a.jpg' }} onChange={vi.fn()} />
        ));
        expect(getByText('URL ảnh')).toBeTruthy();
        expect(getByDisplayValue('https://example.com/a.jpg')).toBeTruthy();
    });

    it('video mode shows a URL text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'video', value: 'https://example.com/a.mp4' }} onChange={vi.fn()} />
        ));
        expect(getByText('URL video')).toBeTruthy();
        expect(getByDisplayValue('https://example.com/a.mp4')).toBeTruthy();
    });

    it('gradient mode shows a text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'gradient', value: 'linear-gradient(90deg, #f00, #00f)' }} onChange={vi.fn()} />
        ));
        expect(getByText('Giá trị gradient (CSS)')).toBeTruthy();
        expect(getByDisplayValue('linear-gradient(90deg, #f00, #00f)')).toBeTruthy();
    });

    it('typing a new URL in image mode calls onChange with the updated value, same type', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <TypographyColorControl value={{ type: 'image', value: 'https://example.com/a.jpg' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('https://example.com/a.jpg'), { target: { value: 'https://example.com/b.jpg' } });
        expect(onChange).toHaveBeenCalledWith({ type: 'image', value: 'https://example.com/b.jpg' });
    });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx`
Expected: FAIL — `Cannot find module './TypographyColorControl'`

- [ ] **Step 11: Implement `TypographyColorControl.tsx`**

```tsx
// src/modules/cms/admin/nodeBuilder/TypographyColorControl.tsx
import { Show } from 'solid-js';
import { Checkbox } from '@core/components/control/Checkbox';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { ColorControl } from '@core/components/control/ColorControl';
import type { StyleObject } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export type TypographyColor = NonNullable<NonNullable<StyleObject['typography']>['color']>;

export interface TypographyColorControlProps {
    value?: TypographyColor;
    onChange: (value: TypographyColor | undefined) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

const STARTER_VALUE: Record<TypographyColor['type'], string> = {
    solid: '#171717ff',
    image: '',
    gradient: 'linear-gradient(90deg, #000000, #ffffff)',
    video: '',
};

/** Type selector (Solid/Ảnh/Gradient/Video) + the matching sub-field, for the one style
 * property that can be filled with more than a flat color — text clipped to a photo/video/
 * gradient (see docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md
 * §3). `solid` reuses the existing RGBA `ColorControl`; `image`/`video`/`gradient` are plain
 * URL/CSS text fields — there's no swatch to pick for those. */
export function TypographyColorControl(props: TypographyColorControlProps) {
    return (
        <div class="flex flex-col gap-3">
            <Checkbox
                value={!!props.value}
                onChange={(on) => props.onChange(on ? { type: 'solid', value: STARTER_VALUE.solid } : undefined)}
                text={t('cms.node.style.textColorEnabled')}
                fieldless
            />
            <Show when={props.value}>
                {(value) => (
                    <>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.textColorType')}</label>
                            <Select
                                value={value().type}
                                onChange={(v) => {
                                    const type = v as TypographyColor['type'];
                                    props.onChange({ type, value: type === value().type ? value().value : STARTER_VALUE[type] });
                                }}
                                options={[
                                    { value: 'solid', label: t('cms.node.style.textColorTypeSolid') },
                                    { value: 'image', label: t('cms.node.style.textColorTypeImage') },
                                    { value: 'gradient', label: t('cms.node.style.textColorTypeGradient') },
                                    { value: 'video', label: t('cms.node.style.textColorTypeVideo') },
                                ]}
                                fieldless
                            />
                        </div>
                        <Show when={value().type === 'solid'}>
                            <ColorControl
                                label={t('cms.node.style.textColor')}
                                value={value().value}
                                defaultValue="#171717ff"
                                onChange={(v) => props.onChange(v ? { type: 'solid', value: v } : undefined)}
                            />
                        </Show>
                        <Show when={value().type === 'image'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorImageUrl')}</label>
                                <Input value={value().value} onChange={(v) => props.onChange({ type: 'image', value: v ?? '' })} fieldless placeholder="https://..." />
                            </div>
                        </Show>
                        <Show when={value().type === 'video'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorVideoUrl')}</label>
                                <Input value={value().value} onChange={(v) => props.onChange({ type: 'video', value: v ?? '' })} fieldless placeholder="https://..." />
                            </div>
                        </Show>
                        <Show when={value().type === 'gradient'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorGradientValue')}</label>
                                <Input value={value().value} onChange={(v) => props.onChange({ type: 'gradient', value: v ?? '' })} fieldless placeholder="linear-gradient(...)" />
                            </div>
                        </Show>
                    </>
                )}
            </Show>
        </div>
    );
}
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 13: Wire `TypographyColorControl` into `NodeStyleTab.tsx`**

Add the import:

```ts
import { TypographyColorControl } from './TypographyColorControl';
```

In the "Chữ" `InspectorSection`, replace the existing `ColorControl` block (originally lines 169-174):

```tsx
                    <ColorControl
                        label={t('cms.node.style.textColor')}
                        value={style().typography?.color}
                        defaultValue="#171717"
                        onChange={(v) => set('typography', { ...style().typography, color: v })}
                    />
```

with:

```tsx
                    <TypographyColorControl
                        value={style().typography?.color}
                        onChange={(v) => set('typography', { ...style().typography, color: v })}
                    />
```

In the Hover `InspectorSection`, `HoverStyleOverride.typography` is still `Pick<..., 'color'>`, so its color control also switches to `TypographyColorControl` for consistency — replace the existing hover text-color `ColorControl` block (originally lines 394-399):

```tsx
                    <ColorControl
                        label={t('cms.node.style.textColor')}
                        value={style().hover?.typography?.color}
                        defaultValue="#171717"
                        onChange={(v) => setHover('typography', v ? { color: v } : undefined)}
                    />
```

with:

```tsx
                    <TypographyColorControl
                        value={style().hover?.typography?.color}
                        onChange={(v) => setHover('typography', v ? { color: v } : undefined)}
                    />
```

- [ ] **Step 14: Update the two now-broken `NodeStyleTab.test.tsx` assertions that assumed `typography.color` was a plain string**

Search `src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx` for any test asserting on `typography: { color: '...' }` or `getByDisplayValue` against a bare hex string tied to the "Chữ" section's old `ColorControl`. Based on the file read earlier in this session, none of the existing 20 tests directly exercise `typography.color` (the font-family/max-lines/overflow/size/transform/hover tests use other fields) — but re-run the full file first (Step 15) and fix any surprise failures the same way: update the fixture/assertion to the new `{type: 'solid', value: '#...'}` shape, keeping the test's original intent.

- [ ] **Step 15: Run the full `NodeStyleTab.test.tsx` suite plus TypeScript to verify no regressions**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx`
Expected: PASS — all pre-existing tests (20 before this task, now 27 after Task 3's 7 additions) still pass.

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 16: Commit**

```bash
git add src/modules/cms/node/node.types.ts src/modules/cms/node/applyNodeStyle.ts src/modules/cms/node/applyNodeStyle.test.ts src/modules/cms/node/applyNodeHoverStyle.test.ts src/modules/cms/admin/nodeBuilder/TypographyColorControl.tsx src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(text): typography.color becomes solid/image/gradient/video union (background-clip:text for image/gradient)"
```

---

### Task 5: Video-as-text-fill (`TextNode.tsx`)

**Files:**
- Modify: `src/modules/cms/node/primitives/TextNode.tsx`
- Create: `src/modules/cms/node/primitives/TextNode.test.tsx`

**Interfaces:**
- Consumes: `applyNodeStyle` (Task 4's updated typography branch), `props.node.style.typography.color` (Task 4's union type).
- Produces: no new exports — `TextNode` is already registered in `nodeRegistry.ts`, this task only changes its internal rendering.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/modules/cms/node/primitives/TextNode.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { TextNode } from './TextNode';
import type { StyleObject } from '../node.types';

// Matches the established primitive-test convention in this directory (see
// LogoGridNode.test.tsx) — a plain `as any` context/node rather than a full typed fixture.
const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

function makeNode(style: StyleObject, text = 'CAT BOX') {
    return { id: 'n1', type: 'TEXT', props: { text }, style, children: [] } as any;
}

describe('TextNode — typography.color rendering', () => {
    it('renders a plain <p> with inline color for solid mode', () => {
        const { container } = render(() => <TextNode node={makeNode({ typography: { color: { type: 'solid', value: '#f2f2f2ff' } } })} context={baseContext} />);
        const p = container.querySelector('p');
        expect(p).toBeTruthy();
        expect(p!.textContent).toBe('CAT BOX');
        expect(p!.style.color).toBe('#f2f2f2ff');
        expect(container.querySelector('video')).toBeNull();
    });

    it('renders a plain <p> with background-clip:text for image mode', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'image', value: 'https://example.com/a.jpg' } } })} context={baseContext} />
        ));
        const p = container.querySelector('p');
        expect(p).toBeTruthy();
        expect(p!.style.backgroundImage).toBe('url(https://example.com/a.jpg)');
        expect(container.querySelector('video')).toBeNull();
    });

    it('renders a <video> + SVG mask pair for video mode, with the real text as an accessible label', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } }, 'TETTA')} context={baseContext} />
        ));
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toBe('https://example.com/clip.mp4');
        expect(video!.hasAttribute('autoplay')).toBe(true);
        expect(video!.hasAttribute('muted')).toBe(true);
        expect(video!.hasAttribute('loop')).toBe(true);
        expect(container.querySelector('svg mask text')?.textContent).toBe('TETTA');
        expect(container.querySelector('[aria-label="TETTA"]')).toBeTruthy();
    });

    it('video mode is masked to the video element via a generated element id (mask/-webkit-mask both point at it)', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } })} context={baseContext} />
        ));
        const video = container.querySelector('video') as HTMLVideoElement;
        const mask = container.querySelector('svg mask') as SVGMaskElement;
        expect(mask.id).toBeTruthy();
        expect(video.style.getPropertyValue('mask')).toBe(`url(#${mask.id})`);
        expect(video.style.getPropertyValue('-webkit-mask')).toBe(`url(#${mask.id})`);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: FAIL — no `<video>`/`<svg>` rendered for video mode yet (current `TextNode.tsx` always renders a single `<p>`).

- [ ] **Step 3: Implement the video branch**

```tsx
// src/modules/cms/node/primitives/TextNode.tsx
import { Show, createUniqueId } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '');
    const style = () => props.node.style ?? {};
    const isVideoFill = () => style().typography?.color?.type === 'video';
    const maskId = createUniqueId();

    return (
        <Show
            when={isVideoFill()}
            fallback={<p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())}>{text()}</p>}
        >
            {/* Video-as-text-fill (scoped to short/single-line headline text — see
                docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md
                §4): no CSS property lets a <video> fill text directly, so the video plays as a
                normal element and an SVG <mask> containing matching <text> clips it to the
                glyph shapes. `t.color.value` is only read for `video` here — every other mode
                is fully handled by `applyNodeStyle`'s inline style, unchanged from before. */}
            <span class="relative inline-block" style={applyNodeStyle({ ...style(), typography: { ...style().typography, color: undefined } }, props.node.responsiveOverrides, props.context.device())}>
                <span class="sr-only" aria-label={text()}>{text()}</span>
                <svg width="0" height="0" aria-hidden="true" class="absolute">
                    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                        <text
                            x="0"
                            y="1em"
                            fill="#fff"
                            font-family={style().typography?.fontFamily ?? 'inherit'}
                            font-size={style().typography?.size ? `${style().typography!.size}px` : '1em'}
                            font-weight={style().typography?.weight ?? 400}
                        >
                            {text()}
                        </text>
                    </mask>
                </svg>
                <video
                    src={style().typography!.color!.value}
                    autoplay
                    muted
                    loop
                    playsinline
                    class="absolute inset-0 h-full w-full object-cover"
                    style={{ mask: `url(#${maskId})`, '-webkit-mask': `url(#${maskId})` }}
                />
                {/* Reserves layout space matching the text's own metrics — the video is
                    absolutely positioned over this invisible copy, same box either way. */}
                <span class="invisible" aria-hidden="true">{text()}</span>
            </span>
        </Show>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the broader node test suite for a regression check**

Run: `npx vitest run src/modules/cms/node/`
Expected: PASS across the whole directory (this touches a shared primitive — confirm nothing else that renders `TextNode` broke).

- [ ] **Step 6: Commit**

```bash
git add src/modules/cms/node/primitives/TextNode.tsx src/modules/cms/node/primitives/TextNode.test.tsx
git commit -m "feat(text): video-as-text-fill via SVG mask, scoped to single-line headline text"
```

---

### Task 6: Close the pre-existing Frame background-video gap

**Files:**
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx`
- Create: `src/modules/cms/node/primitives/FrameNode.test.tsx` (confirmed not to exist yet — this primitive has no test file today)

**Interfaces:**
- Consumes: `StyleObject['background']` (unchanged shape, `type: 'video'` branch was already typed but never rendered).
- Produces: no new exports — internal rendering change only.

- [ ] **Step 1: Write the failing test**

```tsx
// src/modules/cms/node/primitives/FrameNode.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { FrameNode } from './FrameNode';

// Matches the established primitive-test convention in this directory (see LogoGridNode.test.tsx
// and Task 5's TextNode.test.tsx) — a plain `as any` context/node rather than a full typed fixture.
const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

describe('FrameNode — background video (closes the pre-existing "handled at component level" gap)', () => {
    it('renders a real <video> background layer when style.background.type is "video"', () => {
        const node = {
            id: 'frame-1',
            type: 'FRAME',
            style: { background: { type: 'video', value: 'https://example.com/bg.mp4' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toBe('https://example.com/bg.mp4');
        expect(video!.hasAttribute('autoplay')).toBe(true);
        expect(video!.hasAttribute('muted')).toBe(true);
        expect(video!.hasAttribute('loop')).toBe(true);
    });

    it('renders no <video> element for any other background type', () => {
        const node = {
            id: 'frame-2',
            type: 'FRAME',
            style: { background: { type: 'color', value: '#000000ff' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('video')).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: FAIL — no `<video>` element rendered (current `FrameNode.tsx` only ever renders a single `<div>`/`<a>` with inline `style=`).

- [ ] **Step 3: Implement the video background layer**

```tsx
// src/modules/cms/node/primitives/FrameNode.tsx
import { Show } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

export function FrameNode(props: NodeComponentProps) {
    const style = () => ({
        ...applyContainerLayout(props.node, props.context.device()),
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        // A video background layer (below) needs `position: relative` on this box so it can
        // be absolutely positioned to fill it — harmless to always set since Frame's own
        // layout props (flex/grid) are unaffected by `position`.
        position: 'relative' as const,
    });
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;
    const isVideoBackground = () => props.node.style?.background?.type === 'video' && !!props.node.style?.background?.value;

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full project test suite and typecheck**

Run: `npx vitest run`
Expected: PASS across the whole suite (the one pre-existing `nodeRegistry.test.ts` hook-timeout failure documented in that file's own comments is expected and unrelated to this plan).

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/cms/node/primitives/FrameNode.tsx src/modules/cms/node/primitives/FrameNode.test.tsx
git commit -m "fix(frame): implement the previously-documented-but-missing background video layer"
```

---

## Manual verification (after all 6 tasks)

Once all tasks are committed, do a live check in the Node Builder admin (`/admin/cms/node-builder`) — automated tests cover behavior, not visual correctness:

1. Open any Frame's Style tab — confirm Background/Border show OFF by default on a fresh node, and toggling ON reveals the controls with the new starter defaults.
2. Open the color picker popover — confirm the alpha slider is visible and dragging it visibly fades the swatch preview.
3. On a Text node, switch "Kiểu tô màu chữ" to Ảnh (image), paste a real image URL — confirm the text renders filled with that photo, clipped to the letters.
4. Switch the same Text node to Video, paste a real short `.mp4` URL — confirm the video plays inside the letter shapes.
5. On a Frame, set Background type to Video with a real `.mp4` URL — confirm it plays as a full-bleed background behind the Frame's children.
