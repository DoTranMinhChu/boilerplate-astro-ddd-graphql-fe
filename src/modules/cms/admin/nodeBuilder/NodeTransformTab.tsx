// src/modules/cms/admin/nodeBuilder/NodeTransformTab.tsx
import { InputNumber } from '@core/components/control/InputNumber';
import { SliderInput } from '@core/components/control/SliderInput';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { t } from '@/shared/i18n/t';
import type { LayoutProps } from '@/modules/cms/node/node.types';
import { normalizeRotation } from '@/modules/cms/node/commands/rotationMath';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface NodeTransformTabProps {
    layout?: LayoutProps;
    onChange: (next: LayoutProps) => void;
}

/** Panel số x/y/width/height/rotation/zIndex — CHỈ có tác dụng khi node cha của node
 * đang chọn có layoutMode==='free' (applyChildLayout đọc các field này thành CSS
 * position:absolute/transform:rotate()/z-index thật — xem node/applyNodeLayout.ts).
 * Restyled (Toolbar & Inspector Modernization) into an InspectorSection; same
 * props/onChange contract as before. */
export function NodeTransformTab(props: NodeTransformTabProps) {
    const layout = () => props.layout ?? {};

    const set = <K extends keyof LayoutProps>(key: K, value: LayoutProps[K]) =>
        props.onChange({ ...layout(), [key]: value });

    // Chuẩn hoá góc xoay về [-180, 180] chỉ lúc commit (không chặn lúc đang gõ số ngoài khoảng).
    const reset = () =>
        props.onChange({
            ...layout(),
            x: undefined,
            y: undefined,
            width: undefined,
            height: undefined,
            rotation: undefined,
            zIndex: undefined,
        });

    return (
        <InspectorSection
            title={t('cms.node.transform.title')}
            isModified={!!(layout().x != null || layout().y != null || layout().width != null || layout().height != null || layout().rotation != null || layout().zIndex != null)}
            onReset={reset}
            resetButtonLabel={t('cms.node.transform.resetButton')}
        >
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.transform.xLabel')}</label>
                    <InputNumber
                        nullable
                        negative
                        min={Number.MIN_SAFE_INTEGER}
                        value={layout().x ?? null}
                        onChange={(v) => set('x', v ?? undefined)}
                        fieldless
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.transform.yLabel')}</label>
                    <InputNumber
                        nullable
                        negative
                        min={Number.MIN_SAFE_INTEGER}
                        value={layout().y ?? null}
                        onChange={(v) => set('y', v ?? undefined)}
                        fieldless
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.transform.widthLabel')}</label>
                    <InputNumber
                        nullable
                        min={1}
                        value={layout().width ?? null}
                        onChange={(v) => set('width', v == null ? undefined : Math.max(1, v))}
                        fieldless
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.transform.heightLabel')}</label>
                    <InputNumber
                        nullable
                        min={1}
                        value={layout().height ?? null}
                        onChange={(v) => set('height', v == null ? undefined : Math.max(1, v))}
                        fieldless
                    />
                </div>
                <div class="col-span-2">
                    <SliderInput
                        label={t('cms.node.transform.rotationLabel')}
                        value={layout().rotation ?? null}
                        min={-180}
                        max={180}
                        step={1}
                        nullValue={0}
                        negative
                        inputMin={Number.MIN_SAFE_INTEGER}
                        onChange={(v) => set('rotation', v ?? undefined)}
                        onBlur={() => {
                            const current = layout().rotation;
                            if (current == null) return;
                            const next = normalizeRotation(current);
                            if (next !== current) set('rotation', next);
                        }}
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.transform.zIndexLabel')}</label>
                    <InputNumber
                        nullable
                        negative
                        min={Number.MIN_SAFE_INTEGER}
                        value={layout().zIndex ?? null}
                        onChange={(v) => set('zIndex', v ?? undefined)}
                        fieldless
                    />
                </div>
            </div>
        </InspectorSection>
    );
}
