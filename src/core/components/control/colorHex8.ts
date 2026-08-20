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
