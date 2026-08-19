import { createSignal, Show } from 'solid-js';
import { HexColorPicker, HexColorInput } from 'solid-colorful';
import './colorPicker.css';
import { t } from '@/shared/i18n/t';

/** Relative luminance (WCAG) — used only for the non-blocking contrast hint below. */
function luminance(hex: string): number | null {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
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

/** No-code hex color picker (accent/text/background in Page Builder's Style tab).
 * Popover pattern: a swatch button opens the picker; `HexColorInput` lets an admin
 * who already knows a hex code type it directly instead of dragging the canvas. */
export function ColorPickerField(props: ColorPickerFieldProps) {
    const [open, setOpen] = createSignal(false);
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
                onClick={() => setOpen((v) => !v)}
            >
                <Show when={!props.swatchOnly}>
                    <span class="h-4 w-4 rounded-full border border-black/10" style={{ 'background-color': color() }} />
                    <span class="font-mono text-xs text-neutral-600">{color()}</span>
                </Show>
            </button>

            <Show when={open()}>
                <div class="absolute z-30 mt-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                    <HexColorPicker color={color()} onChange={(v) => props.onChange(v)} />
                    <HexColorInput
                        color={color()}
                        onChange={(v) => props.onChange(v)}
                        prefixed
                        class="mt-2 w-full rounded-md border border-neutral-200 px-2 py-1 text-center font-mono text-xs"
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
