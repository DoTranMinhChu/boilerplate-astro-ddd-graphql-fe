// src/modules/cms/admin/nodeBuilder/NodeContentTab.tsx
//
// Admin Content tab for the generic Node tree (Task 24/25) — same directness as
// NodeStyleTab.tsx: one `<Show>` branch per ENodeType, each control writing straight
// into `props.node.props.<key>` via `props.onChange`.
//
// Control APIs here are the REAL signatures (see NodeStyleTab.tsx's header comment for
// how these were derived) — none of Input/Textarea/InputImage/Select carry a `label`
// prop (labels are plain markup next to the control), the change handler is `onChange`
// (not `onInput`), and every control needs `fieldless` since this tab is used outside
// any `<Form>`/`<Field>` context.
import { Show } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { InputImage } from '@core/components/control/InputImage';
import { Select } from '@core/components/control/Select';
import { ENodeType } from '@/modules/cms/node/node.constants';
import type { NodeTree } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export interface NodeContentTabProps {
    node: NodeTree;
    onChange: (props: Record<string, any>) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

/** Per-primitive-type minimal props form for a single tree Node — small enough not to
 * need a generic schema engine (see StyleFieldsEditor/renderBlockFieldControl for how
 * Sections handle the same problem at bigger scale). Consumed by Task 27's NodeInspector. */
export function NodeContentTab(props: NodeContentTabProps) {
    const set = (key: string, value: any) => props.onChange({ ...props.node.props, [key]: value });

    return (
        <div class="flex flex-col gap-4 p-4">
            <Show when={props.node.type === ENodeType.TEXT}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.textLabel')}</label>
                    <Textarea rows={4} value={props.node.props?.text ?? ''} onChange={(v) => set('text', v)} fieldless />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.IMAGE}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.imageLabel')}</label>
                    <InputImage value={props.node.props?.src ?? ''} onChange={(v) => set('src', v)} fieldless />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.altLabel')}</label>
                    <Input value={props.node.props?.alt ?? ''} onChange={(v) => set('alt', v)} fieldless />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.VIDEO}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.videoUrlLabel')}</label>
                    <Input value={props.node.props?.src ?? ''} onChange={(v) => set('src', v)} fieldless />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.ICON}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.iconLabel')}</label>
                    <Input value={props.node.props?.icon ?? ''} onChange={(v) => set('icon', v)} fieldless />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.BUTTON}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.buttonLabelLabel')}</label>
                    <Input value={props.node.props?.label ?? ''} onChange={(v) => set('label', v)} fieldless />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.buttonHrefLabel')}</label>
                    <Input value={props.node.props?.href ?? ''} onChange={(v) => set('href', v)} fieldless />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.SHAPE}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.shapeLabel')}</label>
                    <Select
                        value={props.node.props?.shape ?? 'rectangle'}
                        onChange={(v) => set('shape', v)}
                        options={[
                            { value: 'rectangle', label: t('cms.node.content.shapeRectangle') },
                            { value: 'ellipse', label: t('cms.node.content.shapeEllipse') },
                        ]}
                        fieldless
                    />
                </div>
            </Show>

            <Show when={props.node.type === ENodeType.FORM_EMBED}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.content.formIdLabel')}</label>
                    <Input value={props.node.props?.formId ?? ''} onChange={(v) => set('formId', v)} fieldless />
                </div>
            </Show>
        </div>
    );
}
