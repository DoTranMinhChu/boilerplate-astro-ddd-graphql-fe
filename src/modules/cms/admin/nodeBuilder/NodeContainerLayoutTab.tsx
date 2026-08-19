// src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx
//
// Container-layout Inspector tab (2026-08-19) — exposes `LayoutProps`'s container-facing
// fields (`display`/`gridTemplate`/`direction`/`wrap`), already fully supported by the render
// engine (applyNodeLayout.ts's `applyContainerLayout`, breakpoint-aware via
// `resolveEffectiveLayout`'s `responsiveOverrides` merge — same mechanism NodeTransformTab.tsx
// already uses for x/y/width/height) but never surfaced anywhere in the Inspector before this.
// Shown only for a node with `layoutMode !== 'free'` (a 'free' container is `position:relative`
// with absolutely-positioned children — none of these fields apply, see applyContainerLayout.ts).
// Same standalone-control pattern as NodeStyleTab.tsx (no `<Form>`/`<Field>` context, every
// control needs `fieldless`).
import { Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { InspectorSection } from '@core/components/control/InspectorSection';
import type { LayoutProps } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface NodeContainerLayoutTabProps {
    layout?: LayoutProps;
    onChange: (next: LayoutProps) => void;
}

/** `gridTemplate` is a raw CSS `grid-template-columns` string (applyNodeLayout.ts passes it
 * straight through) — this Inspector only ever WRITES the single uniform shape
 * `repeat(N, 1fr)`, so reading it back only recognizes that exact shape (any other value,
 * e.g. hand-authored via a future raw-CSS escape hatch, shows as empty rather than guessing a
 * column count that isn't really there). */
function columnsOf(gridTemplate: string | undefined): number | null {
    const m = /^repeat\((\d+),\s*1fr\)$/.exec(gridTemplate ?? '');
    return m ? parseInt(m[1], 10) : null;
}

export function NodeContainerLayoutTab(props: NodeContainerLayoutTabProps) {
    const layout = () => props.layout ?? {};
    const set = <K extends keyof LayoutProps>(key: K, value: LayoutProps[K]) =>
        props.onChange({ ...layout(), [key]: value });
    const display = () => layout().display ?? 'flex';

    return (
        <InspectorSection title={t('cms.node.containerLayout.title')}>
            <div class="flex flex-col gap-3">
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.containerLayout.displayLabel')}</label>
                    <Select
                        value={display()}
                        options={[
                            { value: 'flex', label: t('cms.node.containerLayout.displayFlex') },
                            { value: 'grid', label: t('cms.node.containerLayout.displayGrid') },
                        ]}
                        onChange={(v) => set('display', v as 'flex' | 'grid')}
                        fieldless
                    />
                </div>
                <Show when={display() === 'grid'}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.containerLayout.columnsLabel')}</label>
                        <InputNumber
                            nullable
                            min={1}
                            value={columnsOf(layout().gridTemplate)}
                            onChange={(v) => set('gridTemplate', v ? `repeat(${v}, 1fr)` : undefined)}
                            fieldless
                        />
                    </div>
                </Show>
                <Show when={display() === 'flex'}>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.directionLabel')}</label>
                            <Select
                                value={layout().direction ?? 'column'}
                                options={[
                                    { value: 'row', label: t('cms.node.containerLayout.directionRow') },
                                    { value: 'column', label: t('cms.node.containerLayout.directionColumn') },
                                ]}
                                onChange={(v) => set('direction', v as 'row' | 'column')}
                                fieldless
                            />
                        </div>
                        <div class="flex items-center justify-between">
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.wrapLabel')}</label>
                            <Checkbox value={!!layout().wrap} onChange={(v) => set('wrap', v || undefined)} fieldless />
                        </div>
                    </div>
                </Show>
            </div>
        </InspectorSection>
    );
}
