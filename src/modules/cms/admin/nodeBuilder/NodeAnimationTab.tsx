// src/modules/cms/admin/nodeBuilder/NodeAnimationTab.tsx
//
// Phase 4 (Animation Timeline) — the 6th Inspector tab, gated on
// `selectedCapabilities()?.animation` (read for the FIRST time ever — this flag has
// existed since Phase 2's nodeTypeRegistry with zero consumers until now). A plain
// ordered-list editor: add/remove/reorder AnimationKeyframe steps, plus 4 one-click
// "quick preset" buttons that prepend a ready-made step (admin can still edit/remove
// it after) — same "fast common case + full manual control" balance every other
// Inspector tab in this builder follows.
import { For, Show } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { t } from '@/shared/i18n/t';
import type { AnimationTimeline, AnimationKeyframe, AnimationProperty } from '@/modules/cms/node/animationTimeline.types';

export interface NodeAnimationTabProps {
    timeline?: AnimationTimeline;
    onChange: (next: AnimationTimeline) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

function newId(): string {
    return `kf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PROPERTY_OPTIONS: { value: AnimationProperty; labelKey: string }[] = [
    { value: 'opacity', labelKey: 'cms.node.animation.propertyOpacity' },
    { value: 'x', labelKey: 'cms.node.animation.propertyX' },
    { value: 'y', labelKey: 'cms.node.animation.propertyY' },
    { value: 'scale', labelKey: 'cms.node.animation.propertyScale' },
    { value: 'rotation', labelKey: 'cms.node.animation.propertyRotation' },
];

const QUICK_PRESETS: { labelKey: string; keyframe: () => Omit<AnimationKeyframe, 'id'> }[] = [
    { labelKey: 'cms.node.animation.presetFadeIn', keyframe: () => ({ property: 'opacity', from: 0, to: 1, duration: 0.8 }) },
    { labelKey: 'cms.node.animation.presetFadeUp', keyframe: () => ({ property: 'y', from: 32, to: 0, duration: 0.8 }) },
    { labelKey: 'cms.node.animation.presetSlideLeft', keyframe: () => ({ property: 'x', from: 48, to: 0, duration: 0.8 }) },
    { labelKey: 'cms.node.animation.presetScaleIn', keyframe: () => ({ property: 'scale', from: 0.9, to: 1, duration: 0.8 }) },
];

export function NodeAnimationTab(props: NodeAnimationTabProps) {
    const timeline = (): AnimationTimeline => props.timeline ?? { keyframes: [], trigger: 'onLoad' };
    // Final whole-branch review: guard against a malformed/partial `animationRef` (the
    // BE's `jsonb` column has no shape validation) — same defensive rationale as
    // applyAnimationTimeline.ts's own `Array.isArray` guard.
    const keyframes = () => (Array.isArray(timeline().keyframes) ? timeline().keyframes : []);

    const setKeyframes = (next: AnimationKeyframe[]) => props.onChange({ ...timeline(), keyframes: next });
    const updateKeyframe = (id: string, patch: Partial<AnimationKeyframe>) => setKeyframes(keyframes().map((k) => (k.id === id ? { ...k, ...patch } : k)));
    const removeKeyframe = (id: string) => setKeyframes(keyframes().filter((k) => k.id !== id));
    const moveKeyframe = (id: string, direction: -1 | 1) => {
        const list = keyframes();
        const idx = list.findIndex((k) => k.id === id);
        const swapWith = idx + direction;
        if (idx === -1 || swapWith < 0 || swapWith >= list.length) return;
        const next = [...list];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        setKeyframes(next);
    };
    const addPreset = (preset: Omit<AnimationKeyframe, 'id'>) => setKeyframes([{ id: newId(), ...preset }, ...keyframes()]);
    const addBlankStep = () => setKeyframes([...keyframes(), { id: newId(), property: 'opacity', to: 1, duration: 0.8 }]);

    return (
        <div class="flex flex-col gap-4 p-4">
            <span class="text-xs font-semibold uppercase text-neutral-400">
                {t('cms.node.animation.tabLabel')}
            </span>
            <div>
                <label class={LABEL_CLASS}>{t('cms.node.animation.quickPresets')}</label>
                <div class="flex flex-wrap gap-2">
                    <For each={QUICK_PRESETS}>
                        {(preset) => (
                            <button
                                type="button"
                                class="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs hover:bg-neutral-100"
                                onClick={() => addPreset(preset.keyframe())}
                            >
                                {t(preset.labelKey as any)}
                            </button>
                        )}
                    </For>
                </div>
            </div>

            <div class="flex flex-col gap-3">
                <For each={keyframes()}>
                    {(kf, index) => (
                        <div class="rounded-lg border border-neutral-200 p-3">
                            <div class="mb-2 flex items-center justify-between">
                                <div class="flex gap-1">
                                    <button type="button" class="text-xs text-neutral-400 hover:text-neutral-700" disabled={index() === 0} onClick={() => moveKeyframe(kf.id, -1)}>{t('cms.node.animation.moveUp')}</button>
                                    <button type="button" class="text-xs text-neutral-400 hover:text-neutral-700" disabled={index() === keyframes().length - 1} onClick={() => moveKeyframe(kf.id, 1)}>{t('cms.node.animation.moveDown')}</button>
                                </div>
                                <button type="button" class="text-xs text-red-500 hover:text-red-700" onClick={() => removeKeyframe(kf.id)}>{t('cms.node.animation.removeStep')}</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="col-span-2">
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.target')}</label>
                                    <Input value={kf.target ?? ''} onChange={(v) => updateKeyframe(kf.id, { target: v || undefined })} fieldless />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.property')}</label>
                                    <Select
                                        value={kf.property}
                                        onChange={(v) => updateKeyframe(kf.id, { property: v as AnimationProperty })}
                                        options={PROPERTY_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as any) }))}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.easing')}</label>
                                    <Input value={kf.easing ?? ''} onChange={(v) => updateKeyframe(kf.id, { easing: v || undefined })} fieldless />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.from')}</label>
                                    <InputNumber nullable negative min={Number.MIN_SAFE_INTEGER} decimal value={kf.from ?? null} onChange={(v) => updateKeyframe(kf.id, { from: v ?? undefined })} fieldless />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.to')}</label>
                                    <InputNumber nullable negative min={Number.MIN_SAFE_INTEGER} decimal value={kf.to ?? null} onChange={(v) => updateKeyframe(kf.id, { to: v ?? 0 })} fieldless />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.duration')}</label>
                                    <InputNumber nullable min={0} decimal value={kf.duration ?? null} onChange={(v) => updateKeyframe(kf.id, { duration: v ?? 0.8 })} fieldless />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.animation.delay')}</label>
                                    <InputNumber nullable min={0} decimal value={kf.delay ?? null} onChange={(v) => updateKeyframe(kf.id, { delay: v ?? undefined })} fieldless />
                                </div>
                            </div>
                        </div>
                    )}
                </For>
                <button type="button" class="rounded border border-dashed border-neutral-300 py-2 text-xs text-neutral-500 hover:border-neutral-400" onClick={addBlankStep}>
                    {t('cms.node.animation.addStep')}
                </button>
            </div>

            <div class="border-t border-neutral-200 pt-3">
                <label class={LABEL_CLASS}>{t('cms.node.animation.trigger')}</label>
                <Select
                    value={timeline().trigger}
                    onChange={(v) => props.onChange({ ...timeline(), trigger: v as 'onLoad' | 'onScroll' })}
                    options={[
                        { value: 'onLoad', label: t('cms.node.animation.triggerOnLoad') },
                        { value: 'onScroll', label: t('cms.node.animation.triggerOnScroll') },
                    ]}
                    fieldless
                />
                <Show when={timeline().trigger === 'onScroll'}>
                    <div class="mt-2">
                        <label class={LABEL_CLASS}>{t('cms.node.animation.scrollStart')}</label>
                        <Input value={timeline().scrollStart ?? ''} onChange={(v) => props.onChange({ ...timeline(), scrollStart: v || undefined })} fieldless placeholder="top 85%" />
                    </div>
                    <Checkbox
                        text={t('cms.node.animation.repeat')}
                        value={timeline().repeat ?? false}
                        onChange={(v) => props.onChange({ ...timeline(), repeat: v })}
                        fieldless
                    />
                </Show>
                <div class="mt-2">
                    <Checkbox
                        text={t('cms.node.animation.mobileEnabled')}
                        value={timeline().mobileEnabled ?? true}
                        onChange={(v) => props.onChange({ ...timeline(), mobileEnabled: v })}
                        fieldless
                    />
                </div>
            </div>
        </div>
    );
}
