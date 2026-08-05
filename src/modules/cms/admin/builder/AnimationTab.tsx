import { For, Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
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
    onPreview: () => void;
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

    return (
        <div class="space-y-3">
            <For each={props.targets}>
                {(target) => {
                    const layer = () => layerFor(target);
                    const enabled = () => !!layer() && layer()!.preset !== EAnimationPreset.NONE;
                    return (
                        <div class="rounded-lg border border-neutral-200 p-3">
                            <label class="mb-2 flex items-center justify-between">
                                <span class="text-sm font-medium capitalize text-neutral-700">{target}</span>
                                <input
                                    type="checkbox"
                                    checked={enabled()}
                                    onChange={(e) => toggle(target, e.currentTarget.checked)}
                                    class="h-4 w-4 rounded border-neutral-300 text-primary-600"
                                />
                            </label>
                            <Show when={enabled()}>
                                <div class="grid grid-cols-2 gap-2">
                                    <Select
                                        value={layer()?.preset}
                                        options={EFFECT_OPTIONS().filter((o) => o.value !== EAnimationPreset.NONE)}
                                        onChange={(v) => updateLayer(target, { preset: v as string })}
                                    />
                                    <Select
                                        value={layer()?.speed ?? EAnimationSpeed.MEDIUM}
                                        options={SPEED_OPTIONS()}
                                        onChange={(v) => updateLayer(target, { speed: v as AnimationLayer['speed'] })}
                                    />
                                </div>
                            </Show>
                        </div>
                    );
                }}
            </For>

            <button
                type="button"
                onClick={props.onPreview}
                class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
            >
                <Icon name="heroicons-solid:play" /> {t('cms.builder.animation.previewButton')}
            </button>
        </div>
    );
}
