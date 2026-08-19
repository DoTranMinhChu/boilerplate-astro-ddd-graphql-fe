// src/modules/cms/admin/nodeBuilder/NodeAnimationTab.tsx
//
// Phase 4 (Animation Timeline) — restyled (Toolbar & Inspector Modernization):
// keyframe cards become compact rows (drag handle + property/step name + delete
// IconButton in the header; a 2-column grid for property/easing/from/to/duration/
// delay in the body), quick-preset buttons become a chip group with a clear
// selected state, and the trigger settings move into an InspectorSection.
// `DragList` wiring (Sub-project E) is reused as-is — only markup changes.
import { For, Show, createSignal } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { IconButton } from '@core/components/control/IconButton';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import { DragList, DragHandle } from '@/modules/cms/admin/DragList';
import type { AnimationTimeline, AnimationKeyframe, AnimationProperty } from '@/modules/cms/node/animationTimeline.types';

export interface NodeAnimationTabProps {
    timeline?: AnimationTimeline;
    onChange: (next: AnimationTimeline) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

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

const EASING_PRESETS: { value: string; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'power1.in', label: 'Power1 In' },
    { value: 'power1.out', label: 'Power1 Out' },
    { value: 'power1.inOut', label: 'Power1 In-Out' },
    { value: 'power2.in', label: 'Power2 In' },
    { value: 'power2.out', label: 'Power2 Out' },
    { value: 'power2.inOut', label: 'Power2 In-Out' },
    { value: 'power3.out', label: 'Power3 Out' },
    { value: 'back.out', label: 'Back Out' },
    { value: 'elastic.out', label: 'Elastic Out' },
    { value: 'bounce.out', label: 'Bounce Out' },
    { value: 'sine.inOut', label: 'Sine In-Out' },
];
const CUSTOM_EASING = '__custom__';

function easingSelectValue(easing: string | undefined): string {
    if (!easing) return '';
    return EASING_PRESETS.some((p) => p.value === easing) ? easing : CUSTOM_EASING;
}

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

    // Task 6 review fix (Critical): purely local UI state tracking "this keyframe's
    // easing field was explicitly switched to Custom via the dropdown" — independent
    // of whatever `easing` currently holds, and NEVER written into the persisted
    // AnimationTimeline. Needed because `easingSelectValue` derives CUSTOM_EASING
    // purely from the stored `easing` string; without this override, selecting
    // "Custom…" while `easing` is unset (or already a preset) had nothing to change
    // stored-value-wise, so the Select immediately reverted on re-render and the
    // free-text box never appeared for a real click.
    const [forcedCustomIds, setForcedCustomIds] = createSignal<Set<string>>(new Set());

    const removeKeyframe = (id: string) => {
        setKeyframes(keyframes().filter((k) => k.id !== id));
        setForcedCustomIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };
    const addPreset = (preset: Omit<AnimationKeyframe, 'id'>) => setKeyframes([{ id: newId(), ...preset }, ...keyframes()]);
    const addBlankStep = () => setKeyframes([...keyframes(), { id: newId(), property: 'opacity', to: 1, duration: 0.8 }]);

    return (
        <InspectorSection title={t('cms.node.animation.tabLabel')}>
            <div class="flex flex-col gap-4">
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.animation.quickPresets')}</label>
                    <div class="flex flex-wrap gap-1.5">
                        <For each={QUICK_PRESETS}>
                            {(preset) => (
                                <button
                                    type="button"
                                    class="rounded-full border border-nb-border bg-nb-bg-subtle px-3 py-1 text-xs font-medium text-nb-text-muted transition-colors hover:border-nb-accent hover:text-nb-accent"
                                    onClick={() => addPreset(preset.keyframe())}
                                >
                                    {t(preset.labelKey as any)}
                                </button>
                            )}
                        </For>
                    </div>
                </div>

                <DragList items={keyframes()} onReorder={setKeyframes} class="flex flex-col gap-2">
                    {(kf, _index, dragHandle) => (
                        <div class="rounded-nb border border-nb-border bg-nb-bg-subtle/50 p-2.5">
                            <div class="mb-2 flex items-center gap-2">
                                <DragHandle {...(dragHandle as any)} aria-label="drag-handle" role="button" />
                                <span class="flex-1 truncate text-xs font-medium text-nb-text">
                                    {t(PROPERTY_OPTIONS.find((o) => o.value === kf.property)?.labelKey as any ?? kf.property)}
                                </span>
                                <IconButton
                                    size="sm"
                                    title={t('cms.node.animation.removeStep')}
                                    onClick={() => removeKeyframe(kf.id)}
                                    icon={<Icon name="heroicons-solid:trash" class="w-3.5 h-3.5 text-red-500" />}
                                />
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
                                    <Select
                                        clearable
                                        value={forcedCustomIds().has(kf.id) ? CUSTOM_EASING : easingSelectValue(kf.easing)}
                                        onChange={(v) => {
                                            if (v === CUSTOM_EASING) {
                                                setForcedCustomIds((prev) => new Set(prev).add(kf.id));
                                            } else {
                                                setForcedCustomIds((prev) => {
                                                    if (!prev.has(kf.id)) return prev;
                                                    const next = new Set(prev);
                                                    next.delete(kf.id);
                                                    return next;
                                                });
                                                updateKeyframe(kf.id, { easing: (v as string) || undefined });
                                            }
                                        }}
                                        options={[{ value: '', label: t('cms.node.animation.easingDefault') }, ...EASING_PRESETS, { value: CUSTOM_EASING, label: t('cms.node.animation.easingCustom') }]}
                                        fieldless
                                    />
                                    <Show when={forcedCustomIds().has(kf.id) || easingSelectValue(kf.easing) === CUSTOM_EASING}>
                                        <div class="mt-1">
                                            <Input value={kf.easing ?? ''} onChange={(v) => updateKeyframe(kf.id, { easing: v || undefined })} fieldless />
                                        </div>
                                    </Show>
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
                </DragList>
                <button type="button" class="rounded-nb border border-dashed border-nb-border py-2 text-xs text-nb-text-muted hover:border-nb-accent hover:text-nb-accent" onClick={addBlankStep}>
                    {t('cms.node.animation.addStep')}
                </button>

                <div class="border-t border-nb-border pt-3">
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
        </InspectorSection>
    );
}
