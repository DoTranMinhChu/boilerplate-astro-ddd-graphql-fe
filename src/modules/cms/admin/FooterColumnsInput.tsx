import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from './DragList';
import type { FooterColumn } from '@/shared/services/footerPreset/footerPreset.service';

/** Editor for footer columns ({title, lines[]}) — each column's lines are edited
 * as one multi-line textarea (one line of the footer column per text line),
 * split/joined on `\n` rather than a nested list-of-lists editor. */
export function FooterColumnsInput() {
    const { value, onChange } = createControl<FooterColumn[]>('object_array', {});
    const items = () => value() || [];

    // Mutate tại chỗ (giữ nguyên reference) — DragList's <For> key theo reference
    // (xem stableKey() trong DragList.tsx); tạo object mới cho dòng đang gõ sẽ khiến
    // <For> unmount+remount cả dòng mỗi phím gõ, làm mất focus đang nhập.
    const update = (index: number, patch: Partial<{ title: string; linesText: string }>) => {
        const next = [...items()];
        const current = next[index];
        if (patch.title !== undefined) current.title = patch.title;
        if (patch.linesText !== undefined) current.lines = patch.linesText.split('\n');
        onChange(next);
    };
    const add = () => onChange([...items(), { title: '', lines: [] }]);
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <DragList items={items()} onReorder={onChange} class="space-y-2">
                {(col, index, dragHandle) => (
                    <div class="flex gap-2 rounded-lg border border-neutral-200 p-3">
                        <DragHandle {...dragHandle} />
                        <div class="flex-1 space-y-2">
                            <Input value={col.title} onChange={(v) => update(index(), { title: String(v ?? '') })} placeholder="Tiêu đề cột (vd: Địa chỉ)" fieldless />
                            <Textarea
                                value={(col.lines || []).join('\n')}
                                onChange={(v) => update(index(), { linesText: String(v ?? '') })}
                                placeholder={'Mỗi dòng 1 ý, vd:\nSố 7, ngõ 37, phố Tây Kết\nHai Bà Trưng, Hà Nội'}
                                rows={3}
                                fieldless
                            />
                            <div class="flex justify-end">
                                <Button sm outline onClick={() => remove(index())}>Xoá cột</Button>
                            </div>
                        </div>
                    </div>
                )}
            </DragList>
            <Button sm onClick={add}>+ Thêm cột</Button>
        </div>
    );
}
