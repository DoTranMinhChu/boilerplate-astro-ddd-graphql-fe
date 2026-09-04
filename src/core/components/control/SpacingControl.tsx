import { createSignal } from 'solid-js';
import { InputNumber } from './InputNumber';
import { IconButton } from './IconButton';
import { BaseIcon } from '@core/components/icon/BaseIcon';

export interface SpacingValue {
    t?: number;
    r?: number;
    b?: number;
    l?: number;
}

export interface SpacingControlProps {
    label: string;
    value?: SpacingValue;
    onChange: (next: SpacingValue) => void;
}

/** Box-model grid (top/right/bottom/left) with a center link/unlink toggle: while
 * linked, editing ANY side writes the SAME value to all 4; while unlinked
 * (default), each side is independent — matches Figma/Canva's spacing control
 * convention. Link state is local UI-only, never persisted on StyleObject. */
export function SpacingControl(props: SpacingControlProps) {
    const [linked, setLinked] = createSignal(false);
    const v = () => props.value ?? {};

    const setSide = (side: keyof SpacingValue, val: number | null) => {
        if (linked()) {
            props.onChange({ t: val ?? undefined, r: val ?? undefined, b: val ?? undefined, l: val ?? undefined });
        } else {
            props.onChange({ ...v(), [side]: val ?? undefined });
        }
    };

    return (
        <div>
            <label class="mb-1 block text-xs font-medium text-nb-text-muted">{props.label}</label>
            <div class="grid grid-cols-3 items-center gap-1.5">
                <div />
                <InputNumber nullable value={v().t ?? null} onChange={(val) => setSide('t', val)} fieldless placeholder="T" />
                <div />
                <InputNumber nullable value={v().l ?? null} onChange={(val) => setSide('l', val)} fieldless placeholder="L" />
                <IconButton
                    size="sm"
                    active={linked()}
                    title={linked() ? 'Bỏ liên kết 4 cạnh' : 'Liên kết 4 cạnh'}
                    onClick={() => setLinked((p) => !p)}
                    icon={<BaseIcon name={linked() ? 'heroicons-solid:link' : 'heroicons-outline:link'} class="w-4 h-4" />}
                />
                <InputNumber nullable value={v().r ?? null} onChange={(val) => setSide('r', val)} fieldless placeholder="R" />
                <div />
                <InputNumber nullable value={v().b ?? null} onChange={(val) => setSide('b', val)} fieldless placeholder="B" />
                <div />
            </div>
        </div>
    );
}
