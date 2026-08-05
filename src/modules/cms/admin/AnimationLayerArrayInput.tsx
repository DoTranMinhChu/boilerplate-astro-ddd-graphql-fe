import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { InputNumber } from '@core/components/control/InputNumber';
import { Button } from '@core/components/button/Button';
import { EAnimationPreset, EAnimationSpeed } from '@/modules/cms/cms.constants';
import type { AnimationLayer } from '@/modules/cms/cms.types';

const PRESET_OPTIONS = [
    { value: EAnimationPreset.NONE, label: 'None' },
    { value: EAnimationPreset.FADE_IN, label: 'Fade In' },
    { value: EAnimationPreset.FADE_UP, label: 'Fade Up' },
    { value: EAnimationPreset.FADE_DOWN, label: 'Fade Down' },
    { value: EAnimationPreset.SLIDE_LEFT, label: 'Slide Left' },
    { value: EAnimationPreset.SLIDE_RIGHT, label: 'Slide Right' },
    { value: EAnimationPreset.SCALE_IN, label: 'Scale In' },
    { value: EAnimationPreset.TEXT_REVEAL, label: 'Text Reveal' },
    { value: EAnimationPreset.STAGGER_CHILDREN, label: 'Stagger Children' },
];
const SPEED_OPTIONS = [
    { value: EAnimationSpeed.SLOW, label: 'Chậm' },
    { value: EAnimationSpeed.MEDIUM, label: 'Vừa' },
    { value: EAnimationSpeed.FAST, label: 'Nhanh' },
];

const emptyLayer = (): AnimationLayer => ({ target: '', preset: EAnimationPreset.FADE_UP, speed: EAnimationSpeed.MEDIUM, delay: 0, mobileEnabled: true });

/** Admin ghép nhiều animation/section, tự chỉnh target/order/timing (mục 8 spec
 * CMS) — chỉ chọn preset có sẵn, không cho nhập easing/keyframe/transform tự do. */
export function AnimationLayerArrayInput(props: { targetOptions: string[] }) {
    const { value, onChange } = createControl<AnimationLayer[]>('object_array', {});
    const layers = () => value() || [];

    const update = (index: number, patch: Partial<AnimationLayer>) => {
        const next = [...layers()];
        next[index] = { ...next[index], ...patch };
        onChange(next);
    };
    const add = () => onChange([...layers(), { ...emptyLayer(), order: layers().length }]);
    const remove = (index: number) => {
        const next = [...layers()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <For each={layers()}>
                {(layer, index) => (
                    <div class="grid grid-cols-12 gap-2 items-center rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-3">
                            <NativeSelect
                                value={layer.target}
                                onChange={(v: string) => update(index(), { target: v })}
                                options={props.targetOptions.map((t) => ({ value: t, label: t }))}
                                optionGroups={[]}
                                emptyPlaceholder="-- target --"
                                clearable
                                fieldless
                            />
                        </div>
                        <div class="col-span-3">
                            <NativeSelect
                                value={layer.preset}
                                onChange={(v: string) => update(index(), { preset: v })}
                                options={PRESET_OPTIONS}
                                optionGroups={[]}
                                emptyPlaceholder=""
                                fieldless
                            />
                        </div>
                        <div class="col-span-2">
                            <NativeSelect
                                value={layer.speed}
                                onChange={(v: string) => update(index(), { speed: v as AnimationLayer['speed'] })}
                                options={SPEED_OPTIONS}
                                optionGroups={[]}
                                emptyPlaceholder=""
                                fieldless
                            />
                        </div>
                        <div class="col-span-2">
                            <InputNumber value={layer.delay} onChange={(v) => update(index(), { delay: v ?? 0 })} placeholder="Delay (ms)" fieldless />
                        </div>
                        <div class="col-span-2 flex justify-end">
                            <Button sm outline onClick={() => remove(index())}>Xoá</Button>
                        </div>
                    </div>
                )}
            </For>
            <Button sm onClick={add}>+ Thêm animation</Button>
        </div>
    );
}
