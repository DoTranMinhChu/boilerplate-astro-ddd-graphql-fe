import { createControl } from '@core/components/control/createControl';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Checkbox } from '@core/components/control/Checkbox';
import { DragList, DragHandle } from './DragList';
import type { DetailFieldLayoutEntry } from '@/modules/cms/sections/ContentDetailSection';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const SLOT_OPTIONS = [
    { value: 'hero', label: 'Ảnh đầu trang' },
    { value: 'title', label: 'Tiêu đề lớn' },
    { value: 'body', label: 'Danh sách nội dung' },
];

/** Same heuristic `ContentDetailSection` falls back to when no layout has been
 * saved yet — so the editor opens already showing what the admin currently sees,
 * not a blank list. */
function buildDefaultLayout(fields: FieldDefinitionDTO[]): DetailFieldLayoutEntry[] {
    let heroAssigned = false;
    let titleAssigned = false;
    return fields
        .filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key)
        .map((f) => {
            let slot: DetailFieldLayoutEntry['slot'] = 'body';
            if (!heroAssigned && f.type === 'IMAGE') { slot = 'hero'; heroAssigned = true; }
            else if (!titleAssigned && (f.isSlugSource || f.type === 'TEXT')) { slot = 'title'; titleAssigned = true; }
            return { key: f.key, slot, visible: true };
        });
}

/** Lets the admin choose which slot (hero image / big title / ordered body list)
 * each Object Type field renders in on a `content-detail` block, reorder body
 * fields by dragging, and hide fields entirely — the "vị trí nào hiển thị Field
 * nào" control for detail pages. */
export function DetailFieldLayoutInput(props: { contentTypeFields: FieldDefinitionDTO[] }) {
    const { value, onChange } = createControl<DetailFieldLayoutEntry[]>('object_array', {});
    const items = () => {
        const stored = value();
        return stored && stored.length ? stored : buildDefaultLayout(props.contentTypeFields);
    };
    const labelFor = (key: string) => props.contentTypeFields.find((f) => f.key === key)?.label || key;

    const update = (index: number, patch: Partial<DetailFieldLayoutEntry>) => {
        const next = [...items()];
        next[index] = { ...next[index], ...patch };
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <p class="text-xs text-neutral-400">Kéo để sắp xếp thứ tự trong danh sách nội dung. Chọn vị trí hiển thị cho từng field.</p>
            <DragList items={items()} onReorder={onChange} class="space-y-2">
                {(entry, index, dragHandle) => (
                    <div class="flex items-center gap-2 rounded-lg border border-neutral-200 p-2">
                        <DragHandle {...dragHandle} />
                        <span class="flex-1 truncate text-sm text-neutral-700">{labelFor(entry.key)}</span>
                        <NativeSelect
                            class="w-36 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700"
                            value={entry.slot}
                            onChange={(v: string) => update(index(), { slot: v as DetailFieldLayoutEntry['slot'] })}
                            options={SLOT_OPTIONS}
                            optionGroups={[]}
                            emptyPlaceholder=""
                            fieldless
                        />
                        <label class="flex items-center gap-1 text-xs text-neutral-500">
                            <Checkbox value={entry.visible} onChange={(v: boolean) => update(index(), { visible: v })} fieldless />
                            Hiện
                        </label>
                    </div>
                )}
            </DragList>
        </div>
    );
}
