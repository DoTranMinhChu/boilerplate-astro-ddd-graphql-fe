// src/modules/cms/admin/nodeBuilder/NodeVisibilityTab.tsx
//
// Covers all 5 VisibilityCondition variants including dateRange/queryParam, which the
// original reference sketch omitted from the UI despite listing them.
//
// Matches evaluateVisibilityRules.ts's fieldValue operator set (Task 9: EFilterOperator.EQUALS/
// NOT_EQUALS/GREATER_THAN/GREATER_THAN_OR_EQUAL/LESS_THAN/LESS_THAN_OR_EQUAL/LIKE — was bare
// 'eq'/'neq'/'gt'/'gte'/'lt'/'lte'/'contains' before the enum/type-safety sweep unified the
// spelling; see evaluateVisibilityRules.ts's normalizeVisibilityOperator for the backward-compat
// read path covering already-saved pages that still have the old spelling).
import { For, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { InspectorSection } from '@core/components/control/InspectorSection';
import type { VisibilityCondition, VisibilityRules } from '@/modules/cms/node/node.types';
import { EVisibilityConditionType, EVisibilityLogic } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';
import { EFilterOperator } from '@core/api/types';
import { normalizeVisibilityOperator } from '@/modules/cms/node/evaluateVisibilityRules';

export interface NodeVisibilityTabProps {
    rules: VisibilityRules | null | undefined;
    onChange: (next: VisibilityRules | null) => void;
    /** Property Inspector Phase 4 (Task 5) — the panel-level property-search query, forwarded
     * verbatim to this file's single `InspectorSection` so a non-matching query hides it.
     * A PLAIN STRING, not an accessor; read `props.searchQuery` fresh inside the JSX prop
     * position and never destructure it off `props`. */
    searchQuery?: string;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

function defaultCondition(type: VisibilityCondition['type']): VisibilityCondition {
    switch (type) {
        case EVisibilityConditionType.DEVICE: return { type: EVisibilityConditionType.DEVICE, value: 'mobile' };
        case EVisibilityConditionType.AUTH_STATE: return { type: EVisibilityConditionType.AUTH_STATE, value: 'loggedIn' };
        case EVisibilityConditionType.DATE_RANGE: return { type: EVisibilityConditionType.DATE_RANGE };
        case EVisibilityConditionType.FIELD_VALUE: return { type: EVisibilityConditionType.FIELD_VALUE, field: '', operator: EFilterOperator.EQUALS, value: '' };
        case EVisibilityConditionType.QUERY_PARAM: return { type: EVisibilityConditionType.QUERY_PARAM, key: '', value: '' };
        default: return { type: EVisibilityConditionType.DEVICE, value: 'mobile' };
    }
}

/** Show/hide condition builder for a single tree Node — see VisibilityRules
 * (Task 10) and evaluateVisibilityRules.ts for how these evaluate at render time.
 * Consumed by Task 27's NodeInspector. */
export function NodeVisibilityTab(props: NodeVisibilityTabProps) {
    const rules = () => props.rules ?? { logic: EVisibilityLogic.AND, conditions: [] };

    const CONDITION_TYPES = () => [
        { value: EVisibilityConditionType.DEVICE, label: t('cms.node.visibility.typeDevice') },
        { value: EVisibilityConditionType.AUTH_STATE, label: t('cms.node.visibility.typeAuthState') },
        { value: EVisibilityConditionType.DATE_RANGE, label: t('cms.node.visibility.typeDateRange') },
        { value: EVisibilityConditionType.FIELD_VALUE, label: t('cms.node.visibility.typeFieldValue') },
        { value: EVisibilityConditionType.QUERY_PARAM, label: t('cms.node.visibility.typeQueryParam') },
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
        props.onChange({ ...rules(), conditions: [...rules().conditions, defaultCondition(EVisibilityConditionType.DEVICE)] });
    };

    return (
        <InspectorSection title={t('cms.node.visibility.tabLabel')} searchQuery={props.searchQuery}>
            <div class="flex flex-col gap-4">
            <p class="text-xs text-nb-text-muted">{t('cms.node.visibility.emptyHint')}</p>

            <Show when={rules().conditions.length > 1}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.visibility.logicLabel')}</label>
                    <Select
                        value={rules().logic}
                        options={[
                            { value: EVisibilityLogic.AND, label: t('cms.node.visibility.logicAnd') },
                            { value: EVisibilityLogic.OR, label: t('cms.node.visibility.logicOr') },
                        ]}
                        onChange={(v) => props.onChange({ ...rules(), logic: v as EVisibilityLogic })}
                        fieldless
                    />
                </div>
            </Show>

            <For each={rules().conditions}>
                {(cond, index) => (
                    <div class="flex flex-col gap-2 rounded-lg border border-nb-border p-3">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.visibility.conditionTypeLabel')}</label>
                            <Select
                                value={cond.type}
                                options={CONDITION_TYPES()}
                                onChange={(v) => updateCondition(index(), defaultCondition(v as EVisibilityConditionType))}
                                fieldless
                            />
                        </div>

                        <Show when={cond.type === EVisibilityConditionType.DEVICE}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.deviceLabel')}</label>
                                <Select
                                    value={(cond as { value: string }).value}
                                    options={[
                                        { value: 'mobile', label: t('cms.node.visibility.deviceMobile') },
                                        { value: 'tablet', label: t('cms.node.visibility.deviceTablet') },
                                        { value: 'desktop', label: t('cms.node.visibility.deviceDesktop') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { type: EVisibilityConditionType.DEVICE, value: v as 'mobile' | 'tablet' | 'desktop' })}
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
                                <p class="mt-1 text-xs text-nb-text-muted">{t('cms.node.visibility.deviceHint')}</p>
                            </div>
                        </Show>

                        <Show when={cond.type === EVisibilityConditionType.AUTH_STATE}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.authStateLabel')}</label>
                                <Select
                                    value={(cond as { value: string }).value}
                                    options={[
                                        { value: 'loggedIn', label: t('cms.node.visibility.authLoggedIn') },
                                        { value: 'loggedOut', label: t('cms.node.visibility.authLoggedOut') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { type: EVisibilityConditionType.AUTH_STATE, value: v as 'loggedIn' | 'loggedOut' })}
                                    fieldless
                                />
                            </div>
                        </Show>

                        <Show when={cond.type === EVisibilityConditionType.DATE_RANGE}>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.dateFromLabel')}</label>
                                    <Input
                                        type="text"
                                        placeholder="2026-01-01"
                                        value={(cond as { from?: string }).from ?? ''}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.DATE_RANGE }), from: v || undefined })}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.dateToLabel')}</label>
                                    <Input
                                        type="text"
                                        placeholder="2026-12-31"
                                        value={(cond as { to?: string }).to ?? ''}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.DATE_RANGE }), to: v || undefined })}
                                        fieldless
                                    />
                                </div>
                            </div>
                        </Show>

                        <Show when={cond.type === EVisibilityConditionType.FIELD_VALUE}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.fieldLabel')}</label>
                                <Input
                                    value={(cond as { field: string }).field}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.FIELD_VALUE }), field: v })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.operatorLabel')}</label>
                                {/* Task 9 (enum/type-safety sweep §3.7): values unified onto
                                    EFilterOperator's $-prefixed spelling (was bare 'eq'/'neq'/...) —
                                    labels/keys/order unchanged, so the visible dropdown is identical.
                                    'contains' -> LIKE (case-sensitive String.includes match below,
                                    same semantics as LIKE, not ILIKE — see evaluateVisibilityRules.ts).
                                    Final whole-branch review, Minor #7: the displayed `value` is run
                                    through the same `normalizeVisibilityOperator` evaluateVisibilityRules.ts
                                    already uses to READ a saved condition — without it, a condition saved
                                    under the OLD bare spelling ('eq' etc.) matched none of this dropdown's
                                    $-prefixed option values and showed up blank, even though evaluation
                                    itself was already correct (no data corruption, purely a display gap). */}
                                <Select
                                    value={normalizeVisibilityOperator((cond as { operator: EFilterOperator }).operator)}
                                    options={[
                                        { value: EFilterOperator.EQUALS, label: t('cms.node.visibility.operatorEq') },
                                        { value: EFilterOperator.NOT_EQUALS, label: t('cms.node.visibility.operatorNeq') },
                                        { value: EFilterOperator.GREATER_THAN, label: t('cms.node.visibility.operatorGt') },
                                        { value: EFilterOperator.GREATER_THAN_OR_EQUAL, label: t('cms.node.visibility.operatorGte') },
                                        { value: EFilterOperator.LESS_THAN, label: t('cms.node.visibility.operatorLt') },
                                        { value: EFilterOperator.LESS_THAN_OR_EQUAL, label: t('cms.node.visibility.operatorLte') },
                                        { value: EFilterOperator.LIKE, label: t('cms.node.visibility.operatorContains') },
                                    ]}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.FIELD_VALUE }), operator: v as EFilterOperator })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.visibility.valueLabel')}</label>
                                <Input
                                    value={String((cond as { value?: any }).value ?? '')}
                                    onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.FIELD_VALUE }), value: v })}
                                    fieldless
                                />
                            </div>
                        </Show>

                        <Show when={cond.type === EVisibilityConditionType.QUERY_PARAM}>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.queryParamKeyLabel')}</label>
                                    <Input
                                        value={(cond as { key: string }).key}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.QUERY_PARAM }), key: v })}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{t('cms.node.visibility.queryParamValueLabel')}</label>
                                    <Input
                                        value={(cond as { value: string }).value}
                                        onChange={(v) => updateCondition(index(), { ...(cond as VisibilityCondition & { type: typeof EVisibilityConditionType.QUERY_PARAM }), value: v })}
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
