// src/modules/tenant/pages/staff/components/PermRow.tsx

import { createSignal, Show, For, Accessor, createMemo } from 'solid-js';
import { Select } from '@core/components/control/Select';
import type { PermissionItemDTO } from '@/shared/services/accountPermission/accountPermission.service';
import { getScopeFieldConfig } from '@/shared/configs/scopeFieldRegistry';
import { IScopeRuleFE, IScopeRuleMeta, buildScopeOptions, ruleToOptionValue, getIdsFromRule, ruleNeedsIds, optionValueToBaseRule, getParentFieldFromRule, setIdsInRule } from '@/shared/helpers/scopeRule.helpers';
import { EScopeRuleType } from '@/shared/generated/typed-graphql';
import { t } from '@/shared/i18n/t';

interface PermRowProps {
    perm: PermissionItemDTO;
    scopeRule: Accessor<IScopeRuleFE | null>;
    onToggle: (permValue: string) => void;
    onScopeChange: (permValue: string, rule: IScopeRuleFE) => void;
}

export function PermRow(props: PermRowProps) {
    const isOn = () => props.scopeRule() !== null;

    // ── Special-case: quyền "Quản lý phân quyền nhân viên" ────────────────────
    // Mô hình Bounded + ALLOW_ALL:
    //   ALLOW_ALL → ủy quyền toàn bộ (full delegated admin, gán được mọi thứ)
    //   bounded   → chỉ gán trong phạm vi quyền của chính người này (dùng SELF
    //               làm rule resolve ra FILTER ≠ ALLOW → BE coi là bounded)
    const isManagePerm = () => props.perm?.value === 'STAFF_PERMISSION_MANAGE';
    const manageValue = () =>
        props.scopeRule()?.type === EScopeRuleType.ALLOW_ALL ? 'ALLOW_ALL' : 'BOUNDED';
    const handleManageChange = (v: string) => {
        props.onScopeChange(
            props.perm?.value!,
            v === 'ALLOW_ALL'
                ? { type: EScopeRuleType.ALLOW_ALL }
                : { type: EScopeRuleType.SELF, field: 'createdByTenantAccountId' },
        );
    };

    const meta = (): IScopeRuleMeta | null => {
        const m = props.perm?.meta;
        if (!m || (!m.byId && !m.byParentField && !m.bySelf)) return null;
        return m as IScopeRuleMeta;
    };

    // resourceGroup từ perm — dùng để lookup compound key 'resourceGroup:id'
    const resourceGroup = () => props.perm?.resourceGroup ?? '';

    const scopeOptions = () => buildScopeOptions(meta());
    const hasOptions = () => scopeOptions().length > 1;

    const initialRule = props.scopeRule() ?? { type: EScopeRuleType.ALLOW_ALL };
    const [localOptionValue, setLocalOptionValue] = createSignal<string>(
        ruleToOptionValue(initialRule),
    );
    const [localIds, setLocalIds] = createSignal<string[]>(
        getIdsFromRule(initialRule),
    );

    const showIdsSelector = createMemo(() =>
        isOn() && ruleNeedsIds(optionValueToBaseRule(localOptionValue())),
    );

    const currentField = createMemo(() =>
        getParentFieldFromRule(optionValueToBaseRule(localOptionValue())),
    );

    // Lookup registry: truyền cả field + resourceGroup để phân biệt 'unit:id' vs 'codeConfig:id'
    const fieldConfig = createMemo(() =>
        getScopeFieldConfig(currentField(), resourceGroup()),
    );

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleToggle = () => props.onToggle(props.perm?.value!);

    const handleScopeTypeChange = (newOptionValue: string) => {
        const prevBase = optionValueToBaseRule(localOptionValue());
        const newBase = optionValueToBaseRule(newOptionValue);
        const prevField = getParentFieldFromRule(prevBase);
        const newField = getParentFieldFromRule(newBase);

        const keptIds = prevField !== newField ? [] : localIds();
        if (prevField !== newField) setLocalIds([]);

        setLocalOptionValue(newOptionValue);

        const finalRule = ruleNeedsIds(newBase)
            ? setIdsInRule(newBase, keptIds)
            : newBase;

        props.onScopeChange(props.perm?.value!, finalRule);
    };

    const handleIdsChange = (newIds: string[]) => {
        const prev = localIds();
        const isSame =
            prev.length === newIds.length &&
            prev.every((id, i) => id === newIds[i]);
        if (isSame) return;

        setLocalIds(newIds);
        const base = optionValueToBaseRule(localOptionValue());
        props.onScopeChange(props.perm?.value!, setIdsInRule(base, newIds));
    };

    const idsLabel = () => {
        const base = optionValueToBaseRule(localOptionValue());
        if (base.type === EScopeRuleType.EXCLUDE) return t('tenant.permission.row.excludeLabel');
        return t('tenant.permission.row.limitToLabel', {
            label: meta()?.byParentLabel ?? t('tenant.permission.row.defaultListLabel'),
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            class="px-3 sm:px-4 py-2.5 transition-colors"
            classList={{ 'bg-blue-50/30': isOn() }}
        >
            {/* Toggle + Label + Scope selector */}
            <div class="flex items-center gap-2">

                <button
                    type="button"
                    onClick={handleToggle}
                    class={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full
                            transition-colors duration-200 focus:outline-none
                            ${isOn() ? 'bg-blue-500' : 'bg-gray-200'}`}
                    title={isOn() ? t('tenant.permission.row.toggleOffTitle') : t('tenant.permission.row.toggleOnTitle')}
                >
                    <span
                        class={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow
                                transition-transform duration-200
                                ${isOn() ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
                    />
                </button>

                <p
                    class="flex-1 min-w-0 text-sm truncate select-none"
                    classList={{ 'text-gray-700': isOn(), 'text-gray-400': !isOn() }}
                    title={props.perm?.label!}
                >
                    {props.perm?.label}
                </p>

                <Show when={isOn() && hasOptions() && !isManagePerm()}>
                    <select
                        class="shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1
                               bg-white text-gray-600 focus:outline-none focus:ring-1
                               focus:ring-blue-300 min-w-[110px] max-w-[180px]"
                        value={localOptionValue()}
                        onInput={e => handleScopeTypeChange(e.currentTarget.value)}
                    >
                        <For each={scopeOptions()}>
                            {opt => <option value={opt.value}>{opt.label}</option>}
                        </For>
                    </select>
                </Show>

                {/* Quản lý phân quyền: chọn phạm vi ủy quyền */}
                <Show when={isOn() && isManagePerm()}>
                    <select
                        class="shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1
                               bg-white text-gray-600 focus:outline-none focus:ring-1
                               focus:ring-blue-300 min-w-[140px] max-w-[210px]"
                        value={manageValue()}
                        onInput={e => handleManageChange(e.currentTarget.value)}
                        title={t('tenant.permission.row.manageScopeTitle')}
                    >
                        <option value="ALLOW_ALL">{t('tenant.permission.row.allowAllOption')}</option>
                        <option value="BOUNDED">{t('tenant.permission.row.boundedOption')}</option>
                    </select>
                </Show>
            </div>

            {/* Ids selector */}
            <Show when={showIdsSelector()}>
                <div class="mt-2 pl-3 border-l-2 border-blue-200">
                    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                        {idsLabel()}
                    </p>

                    <Show
                        // fieldConfig() có → dùng searchable dropdown
                        // fieldConfig() undefined → fallback text input (field chưa đăng ký)
                        when={fieldConfig() !== undefined}
                        fallback={
                            <div class="text-xs text-amber-600 bg-amber-50 border border-amber-200
                                        rounded-lg px-3 py-2">
                                {t('tenant.permission.row.missingFieldPrefix')} <code class="font-mono">{currentField()}</code> {t('tenant.permission.row.missingFieldSuffix')} <code class="font-mono">scopeFieldRegistry.ts</code>.
                            </div>
                        }
                    >
                        <Select
                            fieldless
                            multi
                            type="array"
                            nullable
                            clearable
                            placeholder={fieldConfig()!.placeholder}
                            value={localIds()}
                            onChange={(ids: any) =>
                                handleIdsChange(Array.isArray(ids) ? ids : [])
                            }
                            optionsQuery={{
                                query: (input: any) => fieldConfig()!.query(input),
                                option: (item: any) => ({
                                    label: fieldConfig()!.getLabel(item),
                                    value: fieldConfig()!.getValue(item),
                                }),
                            }}
                        />
                    </Show>
                </div>
            </Show>
        </div>
    );
}