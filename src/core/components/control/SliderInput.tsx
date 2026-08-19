import { InputNumber } from './InputNumber';

export interface SliderInputProps {
    label: string;
    value: number | null;
    min: number;
    max: number;
    step: number;
    nullValue?: number;
    /** Numeric-field clamp bounds, only when the wrapped field used to pass its
     * own InputNumber min/max (e.g. opacity). Omit to leave the field itself
     * unclamped (rotation, font-weight's prior behavior). */
    inputMin?: number;
    inputMax?: number;
    negative?: boolean;
    decimal?: boolean;
    onChange: (value: number | null) => void;
    onBlur?: () => void;
}

/** Thin wrapper composing the existing `Slider` + `InputNumber` (via InputNumber's
 * own `slider` mode, Sub-project E) with a shared label — consolidates the
 * hand-wired `<div><label/><InputNumber slider={...}/></div>` pattern each tab
 * previously repeated for opacity/rotation/font-weight. */
export function SliderInput(props: SliderInputProps) {
    return (
        <div>
            <label class="mb-1 block text-xs font-medium text-nb-text-muted">{props.label}</label>
            <InputNumber
                nullable
                negative={props.negative}
                decimal={props.decimal}
                {...(props.inputMin !== undefined ? { min: props.inputMin } : {})}
                {...(props.inputMax !== undefined ? { max: props.inputMax } : {})}
                value={props.value}
                onChange={props.onChange}
                onBlur={props.onBlur}
                fieldless
                slider={{ min: props.min, max: props.max, step: props.step, nullValue: props.nullValue }}
            />
        </div>
    );
}
