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
