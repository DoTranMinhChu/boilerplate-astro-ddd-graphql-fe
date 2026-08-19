import { Input } from './Input';
import { ColorPickerField } from '@/modules/cms/admin/builder/ColorPickerField';

export interface ColorControlProps {
    label: string;
    value?: string;
    defaultValue: string;
    onChange: (value: string | undefined) => void;
}

/** Row combining `ColorPickerField`'s existing swatch+popover picker with an
 * always-visible, directly-editable hex `Input` alongside it. `ColorPickerField`
 * alone hides its hex field inside the popover — this surfaces one for fast typed
 * edits without opening the picker, replacing NodeStyleTab's prior
 * `ColorPickerField`-only layout. `ColorPickerField` itself is reused unchanged
 * (its own label is passed empty since this row supplies its own label above). */
export function ColorControl(props: ColorControlProps) {
    return (
        <div>
            <label class="mb-1 block text-xs font-medium text-nb-text-muted">{props.label}</label>
            <div class="flex items-center gap-2">
                <ColorPickerField label="" value={props.value} defaultValue={props.defaultValue} onChange={props.onChange} />
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
