// src/modules/cms/admin/nodeBuilder/NodeGridItemTab.tsx
//
// Grid-column Inspector tab (Phase 2, Layout & Grid) — CHỈ có tác dụng khi node CHA của node
// đang chọn có layout.display === 'grid' (applyChildLayout đọc colSpan/colStart thành CSS
// grid-column thật khi parentDisplay==='grid' — xem node/applyNodeLayout.ts). Cùng pattern
// gating-on-the-parent với NodeTransformTab.tsx (gated on parent.layoutMode==='free').
import { InputNumber } from '@core/components/control/InputNumber';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { t } from '@/shared/i18n/t';
import type { LayoutProps } from '@/modules/cms/node/node.types';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface NodeGridItemTabProps {
    layout?: LayoutProps;
    onChange: (next: LayoutProps) => void;
}

export function NodeGridItemTab(props: NodeGridItemTabProps) {
    const layout = () => props.layout ?? {};
    const set = <K extends keyof LayoutProps>(key: K, value: LayoutProps[K]) =>
        props.onChange({ ...layout(), [key]: value });

    return (
        <InspectorSection
            title={t('cms.node.gridItem.title')}
            isModified={!!(layout().colSpan != null || layout().colStart != null)}
            onReset={() => props.onChange({ ...layout(), colSpan: undefined, colStart: undefined })}
            resetButtonLabel={t('cms.node.transform.resetButton')}
        >
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.gridItem.colSpanLabel')}</label>
                    <InputNumber
                        nullable
                        min={1}
                        max={12}
                        value={layout().colSpan ?? null}
                        onChange={(v) => set('colSpan', v ?? undefined)}
                        fieldless
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.gridItem.colStartLabel')}</label>
                    <InputNumber
                        nullable
                        min={1}
                        max={12}
                        value={layout().colStart ?? null}
                        onChange={(v) => set('colStart', v ?? undefined)}
                        fieldless
                    />
                </div>
            </div>
        </InspectorSection>
    );
}
