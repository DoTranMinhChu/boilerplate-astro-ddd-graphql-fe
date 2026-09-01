// src/modules/cms/admin/nodeBuilder/NodeAdvancedTab.tsx
//
// Property Inspector redesign, Phase 3 — the 3 genuinely new "Nâng cao" field groups (Element,
// Accessibility, Developer) with real data-model backing added this phase (NodeAdvancedConfig in
// node/node.types.ts + the BE `advanced` jsonb column). Positioning (NodeTransformTab/
// NodeGridItemTab) and Data (NodeDataSourceTab/NodeDataBindingTab) already exist unchanged — this
// file does NOT duplicate them; NodeBuilder.page.tsx mounts all 5 groups side by side in its
// `advancedTab` prop.
//
// Deliberately UNGATED by node capability: unlike Positioning (parent-layout dependent) and Data
// (repeat/dataBinding capability dependent), an HTML id / extra class / aria-label / raw CSS is
// meaningful on every node type, so NodeBuilder.page.tsx mounts this with no <Show> capability
// check.
import { Input } from '@core/components/control/Input';
import { Checkbox } from '@core/components/control/Checkbox';
import { Textarea } from '@core/components/control/Textarea';
import { InspectorSection } from '@core/components/control/InspectorSection';
import type { NodeAdvancedConfig } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface NodeAdvancedTabProps {
    advanced?: NodeAdvancedConfig;
    onChange: (next: NodeAdvancedConfig) => void;
}

export function NodeAdvancedTab(props: NodeAdvancedTabProps) {
    const advanced = () => props.advanced ?? {};
    const set = <K extends keyof NodeAdvancedConfig>(key: K, value: NodeAdvancedConfig[K]) =>
        props.onChange({ ...advanced(), [key]: value });

    return (
        <>
            <InspectorSection
                title={t('cms.node.advanced.elementTitle')}
                isModified={!!(advanced().htmlId || advanced().cssClass)}
                onReset={() => props.onChange({ ...advanced(), htmlId: undefined, cssClass: undefined })}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div>
                        <label class={LABEL_CLASS} for="node-advanced-html-id">{t('cms.node.advanced.htmlIdLabel')}</label>
                        <Input
                            id="node-advanced-html-id"
                            value={advanced().htmlId ?? ''}
                            onChange={(v) => set('htmlId', v || undefined)}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS} for="node-advanced-css-class">{t('cms.node.advanced.cssClassLabel')}</label>
                        <Input
                            id="node-advanced-css-class"
                            value={advanced().cssClass ?? ''}
                            onChange={(v) => set('cssClass', v || undefined)}
                            fieldless
                        />
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection
                title={t('cms.node.advanced.accessibilityTitle')}
                isModified={!!(advanced().ariaLabel || advanced().ariaHidden || advanced().role)}
                onReset={() => props.onChange({ ...advanced(), ariaLabel: undefined, ariaHidden: undefined, role: undefined })}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div>
                        <label class={LABEL_CLASS} for="node-advanced-aria-label">{t('cms.node.advanced.ariaLabelLabel')}</label>
                        <Input
                            id="node-advanced-aria-label"
                            value={advanced().ariaLabel ?? ''}
                            onChange={(v) => set('ariaLabel', v || undefined)}
                            fieldless
                        />
                    </div>
                    <Checkbox
                        value={!!advanced().ariaHidden}
                        onChange={(v) => set('ariaHidden', v || undefined)}
                        text={t('cms.node.advanced.ariaHiddenLabel')}
                        fieldless
                    />
                    <div>
                        <label class={LABEL_CLASS} for="node-advanced-role">{t('cms.node.advanced.roleLabel')}</label>
                        <Input
                            id="node-advanced-role"
                            value={advanced().role ?? ''}
                            onChange={(v) => set('role', v || undefined)}
                            fieldless
                            placeholder="button, navigation, alert..."
                        />
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection
                title={t('cms.node.advanced.developerTitle')}
                isModified={!!advanced().customCss}
                onReset={() => set('customCss', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div>
                    <label class={LABEL_CLASS} for="node-advanced-custom-css">{t('cms.node.advanced.customCssLabel')}</label>
                    <Textarea
                        id="node-advanced-custom-css"
                        rows={4}
                        class="font-mono text-xs"
                        placeholder="color: red; transform: skewX(-5deg);"
                        value={advanced().customCss ?? ''}
                        onChange={(v) => set('customCss', v || undefined)}
                        fieldless
                    />
                    <p class="mt-1 text-[10px] text-nb-text-muted">{t('cms.node.advanced.customCssHint')}</p>
                </div>
            </InspectorSection>
        </>
    );
}
