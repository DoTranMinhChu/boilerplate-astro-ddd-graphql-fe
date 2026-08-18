// src/core/components/control/Slider.tsx
//
// Minimal styled wrapper around a native <input type="range">, used by InputNumber's
// new `slider` mode (Node Builder Inspector Polish, Task 1) for naturally-bounded
// numeric fields (opacity, rotation, font-weight). Fully controlled — no internal
// signal — so it stays trivially in sync with whatever owns `value`.
export interface SliderProps {
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    class?: string;
}

export function Slider(props: SliderProps) {
    return (
        <input
            type="range"
            class={`h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-main-600 ${props.class ?? ''}`}
            min={props.min}
            max={props.max}
            step={props.step}
            value={props.value}
            onInput={(e) => props.onChange(parseFloat(e.currentTarget.value))}
        />
    );
}
