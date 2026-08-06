import { createControl } from '@core/components/control/createControl';
import { InputNumber } from '@core/components/control/InputNumber';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import type { MixedFeedSource } from '@/modules/cms/cms.types';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';

export interface MixedFeedSourcesInputProps {
    contentTypeOptions: { value: string; label: string }[];
    contentTypesFull: ContentTypeDTO[];
}

const emptySource = (): MixedFeedSource => ({ contentTypeId: '' });

/**
 * Danh sách "nguồn" cho khối Nội dung tổng hợp — mỗi nguồn là 1 Object Type. Mỗi
 * Object Type có field key riêng nên field-mapping (tiêu đề/ảnh/mô tả) phải cấu
 * hình RIÊNG cho từng dòng — 3 dropdown tự đổi theo field thật của Object Type vừa
 * chọn ở dòng đó (ưu tiên select thay vì gõ tay field key).
 */
export function MixedFeedSourcesInput(props: MixedFeedSourcesInputProps) {
    const { value, onChange } = createControl<MixedFeedSource[]>('object_array', {});
    const sources = () => value() || [];

    const updateSource = (index: number, patch: Partial<MixedFeedSource>) => {
        const next = [...sources()];
        next[index] = { ...next[index], ...patch };
        onChange(next);
    };
    const addSource = () => onChange([...sources(), emptySource()]);
    const removeSource = (index: number) => {
        const next = [...sources()];
        next.splice(index, 1);
        onChange(next);
    };

    const fieldOptionsFor = (contentTypeId: string) => {
        const ct = props.contentTypesFull.find((c) => c.id === contentTypeId);
        return (ct?.fields || [])
            .filter((f): f is NonNullable<typeof f> => !!f?.key)
            .map((f) => ({ value: f.key!, label: f.label || f.key! }));
    };

    return (
        <div class="space-y-3">
            {sources().map((source, index) => {
                const fieldOptions = () => fieldOptionsFor(source.contentTypeId);
                return (
                    <div class="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                        <div class="grid grid-cols-12 gap-3">
                            <div class="col-span-8">
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.mixedFeed.sourceContentType')}</p>
                                <NativeSelect
                                    value={source.contentTypeId}
                                    onChange={(v: string) => updateSource(index, { contentTypeId: v, fieldMapping: {} })}
                                    options={props.contentTypeOptions}
                                    optionGroups={[]}
                                    emptyPlaceholder="-- Chọn --"
                                    fieldless
                                />
                            </div>
                            <div class="col-span-3">
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.fields.displayLimit')}</p>
                                <InputNumber value={source.limit} onChange={(v: number | null) => updateSource(index, { limit: v ?? undefined })} placeholder="12" fieldless />
                            </div>
                            <div class="col-span-1 flex items-end justify-end pb-0.5">
                                <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.builder.mixedFeed.removeSource')} />} onClick={() => removeSource(index)} />
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.fields.fieldMappingHeading')}</p>
                                <NativeSelect
                                    value={source.fieldMapping?.heading}
                                    onChange={(v: string) => updateSource(index, { fieldMapping: { ...source.fieldMapping, heading: v } })}
                                    options={fieldOptions()}
                                    optionGroups={[]}
                                    emptyPlaceholder="-- Chọn field --"
                                    fieldless
                                />
                            </div>
                            <div>
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.fields.fieldMappingImage')}</p>
                                <NativeSelect
                                    value={source.fieldMapping?.image}
                                    onChange={(v: string) => updateSource(index, { fieldMapping: { ...source.fieldMapping, image: v } })}
                                    options={fieldOptions()}
                                    optionGroups={[]}
                                    emptyPlaceholder="-- Chọn field --"
                                    fieldless
                                />
                            </div>
                            <div>
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.fields.fieldMappingDescription')}</p>
                                <NativeSelect
                                    value={source.fieldMapping?.description}
                                    onChange={(v: string) => updateSource(index, { fieldMapping: { ...source.fieldMapping, description: v } })}
                                    options={fieldOptions()}
                                    optionGroups={[]}
                                    emptyPlaceholder="-- Chọn field --"
                                    fieldless
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
            <Button sm outline onClick={addSource}>{t('cms.builder.mixedFeed.addSource')}</Button>
        </div>
    );
}
