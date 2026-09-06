import { Show } from 'solid-js';
import type { FieldGridLayoutItem } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

export interface GridLayoutInspectorPanelProps {
    item: FieldGridLayoutItem | undefined;
    fieldLabel: string;
    onPatch: (delta: Partial<FieldGridLayoutItem>) => void;
    onClose: () => void;
}

const ALIGN_OPTIONS: { value: NonNullable<FieldGridLayoutItem['align']>; labelKey: string }[] = [
    { value: 'start', labelKey: 'cms.contentTypeConfig.gridInspector.alignStart' },
    { value: 'center', labelKey: 'cms.contentTypeConfig.gridInspector.alignCenter' },
    { value: 'end', labelKey: 'cms.contentTypeConfig.gridInspector.alignEnd' },
    { value: 'stretch', labelKey: 'cms.contentTypeConfig.gridInspector.alignStretch' },
];

/** Numeric side-panel for the field currently selected in `GridLayoutBuilder` — a plain
 * controlled component (no `createControl`/`Datatable.Field`), same convention
 * `ContentVisibilityRulesInput.tsx`'s controlled-mode already established: it edits one arbitrary
 * property of whichever item the PARENT currently considers "selected," not a single registered
 * form field of its own. All 6 writes go through the same `onPatch` the canvas itself uses (single
 * source of truth, no parallel state). */
export function GridLayoutInspectorPanel(props: GridLayoutInspectorPanelProps) {
    const numberField = (label: string, key: 'colStart' | 'colSpan' | 'rowStart' | 'rowSpan' | 'minHeight', min: number) => (
        <div>
            <label class="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
            <input
                type="number"
                min={min}
                class="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
                value={props.item?.[key] ?? ''}
                onInput={(e) => {
                    const raw = e.currentTarget.value;
                    if (raw === '') {
                        if (key === 'minHeight') props.onPatch({ minHeight: undefined });
                        return;
                    }
                    const num = Number(raw);
                    if (!Number.isNaN(num)) props.onPatch({ [key]: num } as Partial<FieldGridLayoutItem>);
                }}
            />
        </div>
    );

    return (
        <Show when={props.item}>
            <div class="w-64 shrink-0 space-y-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-neutral-800">{props.fieldLabel}</p>
                    <button type="button" class="text-xs text-neutral-400 hover:text-neutral-700" onClick={props.onClose}>
                        ✕
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    {numberField(t('cms.contentTypeConfig.gridInspector.colStart'), 'colStart', 1)}
                    {numberField(t('cms.contentTypeConfig.gridInspector.colSpan'), 'colSpan', 1)}
                    {numberField(t('cms.contentTypeConfig.gridInspector.rowStart'), 'rowStart', 0)}
                    {numberField(t('cms.contentTypeConfig.gridInspector.rowSpan'), 'rowSpan', 1)}
                </div>
                {numberField(t('cms.contentTypeConfig.gridInspector.minHeight'), 'minHeight', 0)}
                <div>
                    <label class="mb-1 block text-xs font-medium text-neutral-600">{t('cms.contentTypeConfig.gridInspector.align')}</label>
                    <select
                        class="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
                        value={props.item?.align ?? 'stretch'}
                        onChange={(e) => props.onPatch({ align: e.currentTarget.value as FieldGridLayoutItem['align'] })}
                    >
                        {ALIGN_OPTIONS.map((opt) => (
                            <option value={opt.value}>{t(opt.labelKey)}</option>
                        ))}
                    </select>
                </div>
            </div>
        </Show>
    );
}
