import { For, Show } from 'solid-js';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import { EAnimationPreset, EAnimationSpeed } from '@/modules/cms/cms.constants';
import type { AnimationLayer } from '@/modules/cms/cms.types';

const EFFECT_OPTIONS = () => [
    { value: EAnimationPreset.NONE, label: t('cms.builder.animation.effectOptions.none') },
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

export interface AnimationTabProps {
    targets: string[];
    animation?: AnimationLayer[];
    onChange: (animation: AnimationLayer[]) => void;
    /** `start`/`end` jump the GSAP timeline straight to that frame (no playback) so
     * admin can compare before/after without waiting; `replay` plays it through from
     * the start, same as scrolling into view on the real site. */
    onPreview: (mode: 'start' | 'end' | 'replay') => void;
}

/** One row per known-animatable element of the selected block type (spec §4) — toggle,
 * named effect + speed dropdowns, instead of the old raw array/JSON entry form. */
export function AnimationTab(props: AnimationTabProps) {
    const layers = () => props.animation ?? [];
    const layerFor = (target: string) => layers().find((l) => l.target === target);

    const updateLayer = (target: string, patch: Partial<AnimationLayer>) => {
        const existing = layerFor(target);
        const next = existing
            ? layers().map((l) => (l.target === target ? { ...l, ...patch } : l))
            : [...layers(), { target, preset: EAnimationPreset.FADE_UP, order: layers().length + 1, delay: 0, speed: EAnimationSpeed.MEDIUM, ...patch }];
        props.onChange(next);
    };

    const toggle = (target: string, enabled: boolean) => {
        if (enabled) {
            updateLayer(target, { preset: layerFor(target)?.preset ?? EAnimationPreset.FADE_UP });
        } else {
            props.onChange(layers().filter((l) => l.target !== target));
        }
    };

    const selectClass = 'w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-primary-400';

    return (
        <div class="space-y-3">
            <For each={props.targets}>
                {(target) => {
                    const layer = () => layerFor(target);
                    const enabled = () => !!layer() && layer()!.preset !== EAnimationPreset.NONE;
                    return (
                        <div class={`rounded-lg border p-3 transition ${enabled() ? 'border-primary-200 bg-primary-50/40' : 'border-neutral-200'}`}>
                            <label class="flex items-center justify-between">
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
                                            class={selectClass}
                                            value={layer()?.preset}
                                            options={EFFECT_OPTIONS().filter((o) => o.value !== EAnimationPreset.NONE)}
                                            optionGroups={[]}
                                            emptyPlaceholder=""
                                            onChange={(v: string) => updateLayer(target, { preset: v })}
                                            fieldless
                                        />
                                    </div>
                                    <div>
                                        <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.animation.speed')}</p>
                                        <NativeSelect
                                            class={selectClass}
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

            {/* 3 chế độ xem: nhảy thẳng tới trạng thái ĐẦU/CUỐI (không cần đợi phát) để so
                sánh trước/sau ngay lập tức, và "Phát lại" để xem đúng như khi cuộn trang
                thật. Không đòi hỏi phải bấm phát rồi chờ mới thấy được kết quả cuối. */}
            <div class="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={() => props.onPreview('start')}
                    class="flex items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                    <Icon name="heroicons-solid:rewind" /> {t('cms.builder.animation.previewStartButton')}
                </button>
                <button
                    type="button"
                    onClick={() => props.onPreview('replay')}
                    class="flex items-center justify-center gap-1 rounded-lg border border-primary-200 bg-primary-50 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100"
                >
                    <Icon name="heroicons-solid:play" /> {t('cms.builder.animation.previewButton')}
                </button>
                <button
                    type="button"
                    onClick={() => props.onPreview('end')}
                    class="flex items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                    <Icon name="heroicons-solid:fast-forward" /> {t('cms.builder.animation.previewEndButton')}
                </button>
            </div>
        </div>
    );
}
