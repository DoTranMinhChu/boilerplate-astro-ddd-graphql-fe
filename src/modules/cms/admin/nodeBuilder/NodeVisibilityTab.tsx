// src/modules/cms/admin/nodeBuilder/NodeVisibilityTab.tsx
//
// Admin Visibility tab for the generic Node tree (Task 24/25) — a condition-list
// builder (add/remove/edit conditions, AND/OR toggle once 2+ conditions exist), same
// standalone-control pattern as NodeStyleTab.tsx (no `<Form>`/`<Field>` context, so
// every control needs `fieldless`; no `label` prop on Select/Input — labels are plain
// markup next to the control; `onChange` not `onInput`; Button uses `label`/color
// boolean props like `ghost`/`outline`, per RawEditTab.tsx's usage in this codebase).
//
// Covers all 5 VisibilityCondition variants (node.types.ts) — the brief's reference
// code only sketched per-type fields for device/authState/fieldValue and left
// dateRange/queryParam with no editable UI despite listing them in CONDITION_TYPES;
// added dateRange (from/to) and queryParam (key/value) fields here so every condition
// type in the picker is actually editable, matching evaluateVisibilityRules.ts's
// fieldValue operator set (eq/neq/gt/gte/lt/lte/contains — not the guessed 'eq' only).
import { For, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { InspectorSection } from '@core/components/control/InspectorSection';
import type { VisibilityCondition, VisibilityRules } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export interface NodeVisibilityTabProps {
    rules: VisibilityRules | null | undefined;
    onChange: (next: VisibilityRules | null) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

function defaultCondition(type: VisibilityCondition['type']): VisibilityCondition {
    switch (type) {
        case 'device': return { type: 'device', value: 'mobile' };
        case 'authState': return { type: 'authState', value: 'loggedIn' };
        case 'dateRange': return { type: 'dateRange' };
        case 'fieldValue': return { type: 'fieldValue', field: '', operator: 'eq', value: '' };
        case 'queryParam': return { type: 'queryParam', key: '', value: '' };
        default: return { type: 'device', value: 'mobile' };
    }
}

/** Show/hide condition builder for a single tree Node — see VisibilityRules
 * (Task 10) and evaluateVisibilityRules.ts for how these evaluate at render time.
 * Consumed by Task 27's NodeInspector. */
export function NodeVisibilityTab(props: NodeVisibilityTabProps) {
    const rules = () => props.rules ?? { logic: 'AND' as const, conditions: [] };

    const CONDITION_TYPES = () => [
        { value: 'device', label: t('cms.node.visibility.typeDevice') },
        { value: 'authState', label: t('cms.node.visibility.typeAuthState') },
        { value: 'dateRange', label: t('cms.node.visibility.typeDateRange') },
        { value: 'fieldValue', label: t('cms.node.visibility.typeFieldValue') },
        { value: 'queryParam', label: t('cms.node.visibility.typeQueryParam') },
    ];

    const updateCondition = (index: number, next: VisibilityCondition) => {
        const conditions = [...rules().conditions];
        conditions[index] = next;
        props.onChange({ ...rules(), conditions });
    };
    const removeCondition = (index: number) => {
        const conditions = rules().conditions.filter((_, i) => i !== index);
        props.onChange(conditions.length ? { ...rules(), conditions } : null);
    };
    const addCondition = () => {
        props.onChange({ ...rules(), conditions: [...rules().conditions, defaultCondition('device')] });
    };

    return (
        <InspectorSection title={t('cms.node.visibility.tabLabel')}>
            <div class="flex flex-col gap-4">
            <p class="text-xs text-neutral-500">{t('cms.node.visibility.emptyHint')}</p>

            <Show when={rules().conditions.length > 1}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.visibility.logicLabel')}</label>
                    <Select
                        value={rules().logic}
                        options={[
                            { value: 'AND', label: t('cms.node.visibility.logicAnd') },
                            { value: 'OR', label: t('cms.node.visibility.logicOr') },
                        ]}
                        onChange={(v) => props.onChange({ ...rules(), logic: v as 'AND' | 'OR' })}
                        fieldless
                    />
                </div>
            </Show>

            <For each={rules().conditions}>
                {(cond, index) => (
                    <div class="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.visibility.conditionTypeLabel')}</label>
                            <Select
                                value={cond.type}
                                options={CONDITION_TYPES()}
                                onChange={(v) => updateCondition(index(), defaultCondition(v as VisibilityCondition['type']))}
                                fieldless
                            />
                        </div>

                        <Show when={cond.type === 'device'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.deviceLabel')}</label>
                                <Select
                                    value={(cond as { value: string }).value}
                                    options={[
                                        { value: 'mobile', label: t('cms.node.visibility.deviceMobile') },
                                        { value: 'tablet', label: t('cms.node.visibility.deviceTablet') },
                                        { value: 'desktop', label: t('cms.node.visibility.deviceDesktop') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { type: 'device', value: v as 'mobile' | 'tablet' | 'desktop' })}
                                    fieldless
                                />
                                {/* Phase 3 (Responsive) Task 4: this comment used to warn that
                                    device detection was a hardcoded 'desktop' stub (correct at the
                                    time — Phase 1 limitation). That's no longer true: Task 1 wired
                                    real `useBreakpoint()` detection into the public site
                                    (`ResponsiveNodeTree.tsx`) and a manual preview switcher into the
                                    admin canvas (`previewBreakpoint`, `NodeBuilder.page.tsx`), so a
                                    mobile/tablet device condition now genuinely affects rendering.
                                    The hint text below was updated to match — kept as a hint (not
                                    removed) since it's still useful to tell admins WHERE detection
                                    comes from (the visitor's real browser width). */}
                                <p class="mt-1 text-xs text-neutral-400">{t('cms.node.visibility.deviceHint')}</p>
                            </div>
                        </Show>

                        <Show when={cond.type === 'authState'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.authStateLabel')}</label>
                                <Select
                                    value={(cond as { value: string }).value}
                                    options={[
                                        { value: 'loggedIn', label: t('cms.node.visibility.authLoggedIn') },
                                        { value: 'loggedOut', label: t('cms.node.visibility.authLoggedOut') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { type: 'authState', value: v as 'loggedIn' | 'loggedOut' })}
                                    fieldless
                                />
                            </div>
                        </Show>

                        <Show when={cond.type === 'dateRange'}>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.dateFromLabel')}</label>
                                    <Input
                                        type="text"
                                        placeholder="2026-01-01"
                                        value={(cond as { from?: string }).from ?? ''}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'dateRange' }), from: v || undefined })}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.dateToLabel')}</label>
                                    <Input
                                        type="text"
                                        placeholder="2026-12-31"
                                        value={(cond as { to?: string }).to ?? ''}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'dateRange' }), to: v || undefined })}
                                        fieldless
                                    />
                                </div>
                            </div>
                        </Show>

                        <Show when={cond.type === 'fieldValue'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.fieldLabel')}</label>
                                <Input
                                    value={(cond as { field: string }).field}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'fieldValue' }), field: v })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.operatorLabel')}</label>
                                <Select
                                    value={(cond as { operator: string }).operator}
                                    options={[
                                        { value: 'eq', label: t('cms.node.visibility.operatorEq') },
                                        { value: 'neq', label: t('cms.node.visibility.operatorNeq') },
                                        { value: 'gt', label: t('cms.node.visibility.operatorGt') },
                                        { value: 'gte', label: t('cms.node.visibility.operatorGte') },
                                        { value: 'lt', label: t('cms.node.visibility.operatorLt') },
                                        { value: 'lte', label: t('cms.node.visibility.operatorLte') },
                                        { value: 'contains', label: t('cms.node.visibility.operatorContains') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'fieldValue' }), operator: v })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.valueLabel')}</label>
                                <Input
                                    value={String((cond as { value?: any }).value ?? '')}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'fieldValue' }), value: v })}
                                    fieldless
                                />
                            </div>
                        </Show>

                        <Show when={cond.type === 'queryParam'}>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.queryParamKeyLabel')}</label>
                                    <Input
                                        value={(cond as { key: string }).key}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'queryParam' }), key: v })}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.queryParamValueLabel')}</label>
                                    <Input
                                        value={(cond as { value: string }).value}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: 'queryParam' }), value: v })}
                                        fieldless
                                    />
                                </div>
                            </div>
                        </Show>

                        <Button sm ghost onClick={() => removeCondition(index())} label={t('cms.node.visibility.removeButton')} />
                    </div>
                )}
            </For>

            <Button sm outline onClick={addCondition} label={t('cms.node.visibility.addButton')} />
            </div>
        </InspectorSection>
    );
}
