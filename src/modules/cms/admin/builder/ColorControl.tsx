import { Input } from '@core/components/control/Input';
import { ColorPickerField } from './ColorPickerField';

export interface ColorControlProps {
    label: string;
    value?: string;
    defaultValue: string;
    onChange: (value: string | undefined) => void;
}

/** One compact pill combining `ColorPickerField`'s swatch+popover picker with a
 * directly-editable hex `Input` inside the SAME bordered control — not two
 * separate boxes side by side. `ColorPickerField` renders `swatchOnly` (a bare
 * circle, no border/hex text of its own) and `Input` is borderless/transparent,
 * so the outer pill supplies the single visible border/background for both. */
export function ColorControl(props: ColorControlProps) {
    return (
        <div>
            <label class="mb-1 block text-xs font-medium text-nb-text-muted">{props.label}</label>
            <div class="flex h-9 items-center gap-1.5 rounded-nb-sm border border-nb-border bg-nb-bg pl-2 pr-2.5">
                <ColorPickerField swatchOnly label="" value={props.value} defaultValue={props.defaultValue} onChange={props.onChange} />
                <Input
                    value={props.value ?? props.defaultValue}
                    onChange={(v) => props.onChange(v || undefined)}
                    fieldless
                    class="h-auto flex-1 border-0 bg-transparent p-0"
                    inputClass="p-0 font-mono text-xs"
                    placeholder={props.defaultValue}
                />
            </div>
        </div>
    );
}
