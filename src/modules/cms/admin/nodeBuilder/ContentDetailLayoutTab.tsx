// src/modules/cms/admin/nodeBuilder/ContentDetailLayoutTab.tsx
//
// Custom Content-tab branch for ContentDetailNode (Canvas Editor v2, Task 12) — NOT a plain
// fieldSchema entry, because `content.fieldLayout`'s per-row `key` options are the BOUND
// content-type's actual field list (dynamic, varies per page), which a static FieldDescriptor
// can't express. Mirrors NodeDataBindingTab's existing availableFields prop pattern (both are
// fed by NodeBuilder.page.tsx's boundContentTypeId ancestor walk).
import { For, Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import type { DetailFieldLayoutEntry } from '@/modules/cms/node/primitives/ContentDetailNode';
import { t } from '@/shared/i18n/t';

export interface ContentDetailLayoutTabProps {
    fieldLayout: DetailFieldLayoutEntry[] | undefined;
    /** Same availableFields the sibling NodeDataBindingTab receives — the bound content type's
     * field list, resolved by NodeBuilder.page.tsx's boundContentTypeId ancestor walk. Empty if
     * no cardinality:'one' ancestor is configured yet. */
    availableFields: FieldDefinitionDTO[];
    onChange: (next: DetailFieldLayoutEntry[]) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

export function ContentDetailLayoutTab(props: ContentDetailLayoutTabProps) {
    const layout = () => props.fieldLayout ?? [];
    const fieldOptions = () => props.availableFields.filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key).map((f) => ({ value: f.key, label: f.label || f.key }));

    const update = (i: number, patch: Partial<DetailFieldLayoutEntry>) => {
        const next = [...layout()];
        next[i] = { ...next[i], ...patch };
        props.onChange(next);
    };
    const add = () => props.onChange([...layout(), { key: '', slot: 'body', visible: true }]);
    const remove = (i: number) => props.onChange(layout().filter((_, idx) => idx !== i));

    return (
        <div class="flex flex-col gap-4 p-4">
            <Show when={props.availableFields.length === 0}>
                <p class="text-xs text-neutral-500">{t('cms.node.dataBinding.noFieldsHint')}</p>
            </Show>
            <Show when={props.availableFields.length > 0}>
                <label class={LABEL_CLASS}>{t('cms.node.content.contentDetailLayoutLabel')}</label>
                <For each={layout()}>
                    {(entry, i) => (
                        <div class="grid grid-cols-12 items-center gap-2 rounded-lg border border-neutral-200 p-2">
                            <div class="col-span-5"><Select value={entry.key} options={fieldOptions()} onChange={(v: string) => update(i(), { key: v })} fieldless /></div>
                            <div class="col-span-3">
                                <Select
                                    value={entry.slot}
                                    options={[
                                        { value: 'hero', label: t('cms.node.content.contentDetailSlotHero') },
                                        { value: 'title', label: t('cms.node.content.contentDetailSlotTitle') },
                                        { value: 'body', label: t('cms.node.content.contentDetailSlotBody') },
                                    ]}
                                    onChange={(v: string) => update(i(), { slot: v as DetailFieldLayoutEntry['slot'] })}
                                    fieldless
                                />
                            </div>
                            <div class="col-span-2 flex items-center gap-1">
                                <Checkbox value={entry.visible} onChange={(v) => update(i(), { visible: v })} fieldless />
                                <span class="text-xs text-neutral-500">{t('cms.node.content.contentDetailVisible')}</span>
                            </div>
                            <div class="col-span-2"><Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i())} /></div>
                        </div>
                    )}
                </For>
                <Button sm outline onClick={add}>{t('cms.node.content.contentDetailAddFieldButton')}</Button>
            </Show>
        </div>
    );
}
