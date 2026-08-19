import { Input } from './Input';
import { ColorPickerField } from '@/modules/cms/admin/builder/ColorPickerField';

export interface ColorControlProps {
    label: string;
    value?: string;
    defaultValue: string;
    onChange: (value: string | undefined) => void;
}

/** Row combining `ColorPickerField`'s swatch+popover picker with an always-visible,
 * directly-editable hex `Input` alongside it. `ColorPickerField` is rendered
 * `swatchOnly` (a bare circle, no border/hex text) so its own hex label doesn't
 * duplicate the `Input` right next to it — the two controls edit the same value
 * via the same `onChange`. */
export function ColorControl(props: ColorControlProps) {
    return (
        <div>
            <label class="mb-1 block text-xs font-medium text-nb-text-muted">{props.label}</label>
            <div class="flex items-center gap-2">
                <ColorPickerField swatchOnly label="" value={props.value} defaultValue={props.defaultValue} onChange={props.onChange} />
                <Input
                    value={props.value ?? props.defaultValue}
                    onChange={(v) => props.onChange(v || undefined)}
                    fieldless
                    class="flex-1"
                    placeholder={props.defaultValue}
                />
            </div>
        </div>
    );
}
