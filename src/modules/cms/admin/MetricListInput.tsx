import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from './DragList';
import type { StatMetric } from '@/modules/cms/sections/editorial/StatMetricsSection';

/** Repeatable editor for `stat-metrics`'s animated counters ({value, suffix, label}). */
export function MetricListInput() {
    const { value, onChange } = createControl<StatMetric[]>('object_array', {});
    const items = () => value() || [];

    const update = (index: number, patch: Partial<StatMetric>) => {
        const next = [...items()];
        next[index] = { ...next[index], ...patch };
        onChange(next);
    };
    const add = () => onChange([...items(), { value: 0, suffix: '', label: '' }]);
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <DragList items={items()} onReorder={onChange} class="space-y-2">
                {(metric, index, dragHandle) => (
                    <div class="flex items-center gap-2 rounded-lg border border-neutral-200 p-2">
                        <DragHandle {...dragHandle} />
                        <div class="grid flex-1 grid-cols-12 gap-2">
                            <div class="col-span-3"><InputNumber value={metric.value} onChange={(v) => update(index(), { value: v ?? 0 })} placeholder="Số" fieldless /></div>
                            <div class="col-span-2"><Input value={metric.suffix} onChange={(v) => update(index(), { suffix: String(v ?? '') })} placeholder="+ / %" fieldless /></div>
                            <div class="col-span-5"><Input value={metric.label} onChange={(v) => update(index(), { label: String(v ?? '') })} placeholder="Nhãn" fieldless /></div>
                            <div class="col-span-2 flex justify-end"><Button sm outline onClick={() => remove(index())}>Xoá</Button></div>
                        </div>
                    </div>
                )}
            </DragList>
            <Button sm onClick={add}>+ Thêm chỉ số</Button>
        </div>
    );
}
