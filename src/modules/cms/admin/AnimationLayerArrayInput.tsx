import { For, Show } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { t } from '@/shared/i18n/t';
import { EAnimationPreset, EAnimationSpeed } from '@/modules/cms/cms.constants';
import type { AnimationLayer } from '@/modules/cms/cms.types';

const EFFECT_OPTIONS = () => [
    { value: EAnimationPreset.FADE_IN, label: t('cms.builder.animation.effectOptions.fadeIn') },
    { value: EAnimationPreset.FADE_UP, label: t('cms.builder.animation.effectOptions.fadeUp') },
    { value: EAnimationPreset.FADE_DOWN, label: t('cms.builder.animation.effectOptions.fadeDown') },
    { value: EAnimationPreset.SLIDE_LEFT, label: t('cms.builder.animation.effectOptions.slideLeft') },
    { value: EAnimationPreset.SLIDE_RIGHT, label: t('cms.builder.animation.effectOptions.slideRight') },
    { value: EAnimationPreset.SCALE_IN, label: t('cms.builder.animation.effectOptions.scaleIn') },
    { value: EAnimationPreset.TEXT_REVEAL, label: t('cms.builder.animation.effectOptions.textReveal') },
    { value: EAnimationPreset.STAGGER_CHILDREN, label: t('cms.builder.animation.effectOptions.staggerChildren') },
];
const SPEED_OPTIONS = () => [
    { value: EAnimationSpeed.SLOW, label: t('cms.builder.animation.speedOptions.slow') },
    { value: EAnimationSpeed.MEDIUM, label: t('cms.builder.animation.speedOptions.medium') },
    { value: EAnimationSpeed.FAST, label: t('cms.builder.animation.speedOptions.fast') },
];
const SELECT_CLASS = 'w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-primary-400';

/**
 * Trước đây là 1 lưới select thô (target/preset/speed/delay bằng enum tiếng Anh,
 * không rõ hiệu ứng nào đang bật) — nay dùng LẠI đúng ngôn ngữ hình ảnh của
 * Inspector › Tab Hiệu ứng (AnimationTab.tsx): mỗi phần tử biết trước (targetOptions)
 * là 1 khối bật/tắt riêng, chỉ hiện dropdown Hiệu ứng/Tốc độ (tiếng Việt) khi đã bật —
 * admin thấy ngay đang có bao nhiêu hiệu ứng và áp dụng cho phần tử nào, không cần
 * đoán qua tên field kỹ thuật. Không có nút "▶ Xem thử" như AnimationTab vì các màn
 * dùng input này (Header/Footer preset, Sections) không có canvas xem trước ngay cạnh.
 */
export function AnimationLayerArrayInput(props: { targetOptions: string[] }) {
    const { value, onChange } = createControl<AnimationLayer[]>('object_array', {});
    const layers = () => value() || [];
    const layerFor = (target: string) => layers().find((l) => l.target === target);

    const updateLayer = (target: string, patch: Partial<AnimationLayer>) => {
        const existing = layerFor(target);
        const next = existing
            ? layers().map((l) => (l.target === target ? { ...l, ...patch } : l))
            : [...layers(), { target, preset: EAnimationPreset.FADE_UP, order: layers().length + 1, delay: 0, speed: EAnimationSpeed.MEDIUM, ...patch }];
        onChange(next);
    };

    const toggle = (target: string, enabled: boolean) => {
        if (enabled) {
            updateLayer(target, { preset: layerFor(target)?.preset ?? EAnimationPreset.FADE_UP });
        } else {
            onChange(layers().filter((l) => l.target !== target));
        }
    };

    return (
        <div class="space-y-2">
            <For each={props.targetOptions}>
                {(target) => {
                    const layer = () => layerFor(target);
                    const enabled = () => !!layer() && layer()!.preset !== EAnimationPreset.NONE;
                    return (
                        <div class={`rounded-lg border p-3 transition ${enabled() ? 'border-primary-200 bg-primary-50/40' : 'border-neutral-200'}`}>
                            <label class="flex cursor-pointer items-center justify-between">
                                <span class="text-sm font-medium capitalize text-neutral-700">{target}</span>
                                <input
                                    type="checkbox"
                                    checked={enabled()}
                                    onChange={(e) => toggle(target, e.currentTarget.checked)}
                                    class="h-4 w-4 rounded border-neutral-300 text-primary-600"
                                />
                            </label>
                            <Show when={enabled()}>
                                <div class="mt-3 grid grid-cols-2 gap-3">
                                    <div>
                                        <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.animation.effect')}</p>
                                        <NativeSelect
                                            class={SELECT_CLASS}
                                            value={layer()?.preset}
                                            options={EFFECT_OPTIONS()}
                                            optionGroups={[]}
                                            emptyPlaceholder=""
                                            onChange={(v: string) => updateLayer(target, { preset: v })}
                                            fieldless
                                        />
                                    </div>
                                    <div>
                                        <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.animation.speed')}</p>
                                        <NativeSelect
                                            class={SELECT_CLASS}
                                            value={layer()?.speed ?? EAnimationSpeed.MEDIUM}
                                            options={SPEED_OPTIONS()}
                                            optionGroups={[]}
                                            emptyPlaceholder=""
                                            onChange={(v: string) => updateLayer(target, { speed: v as AnimationLayer['speed'] })}
                                            fieldless
                                        />
                                    </div>
                                </div>
                            </Show>
                        </div>
                    );
                }}
            </For>
        </div>
    );
}
