import { Show } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Select } from '@core/components/control/Select';
import { InputImage } from '@core/components/control/InputImage';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { DragList, DragHandle } from './DragList';
import { ECustomElementType } from '@/modules/cms/cms.constants';
import { t } from '@/shared/i18n/t';
import type { CustomBlockElement } from '@/modules/cms/cms.types';

const ELEMENT_TYPE_OPTIONS = () => [
    { value: ECustomElementType.HEADING, label: t('cms.builder.customBlock.typeHeading') },
    { value: ECustomElementType.TEXT, label: t('cms.builder.customBlock.typeText') },
    { value: ECustomElementType.IMAGE, label: t('cms.builder.customBlock.typeImage') },
    { value: ECustomElementType.BUTTON, label: t('cms.builder.customBlock.typeButton') },
    { value: ECustomElementType.SPACER, label: t('cms.builder.customBlock.typeSpacer') },
    { value: ECustomElementType.DIVIDER, label: t('cms.builder.customBlock.typeDivider') },
];
const ALIGN_OPTIONS = () => [
    { value: 'left', label: t('cms.builder.customBlock.alignLeft') },
    { value: 'center', label: t('cms.builder.customBlock.alignCenter') },
    { value: 'right', label: t('cms.builder.customBlock.alignRight') },
];
const HEADING_LEVEL_OPTIONS = () => [
    { value: 'h2', label: t('cms.builder.customBlock.headingLarge') },
    { value: 'h3', label: t('cms.builder.customBlock.headingMedium') },
    { value: 'h4', label: t('cms.builder.customBlock.headingSmall') },
];
const SPACING_OPTIONS = () => [
    { value: 'sm', label: t('cms.sections.spacingOptions.sm') },
    { value: 'md', label: t('cms.sections.spacingOptions.md') },
    { value: 'lg', label: t('cms.sections.spacingOptions.lg') },
    { value: 'xl', label: t('cms.builder.customBlock.spacingXl') },
];

// `id` cũng chính là animation target hiện trong tab Hiệu ứng (xem Inspector.tsx) —
// đặt tên có ý nghĩa (vd "heading-1", "text-2") thay vì chuỗi ngẫu nhiên, để admin
// nhận ra ngay đang chỉnh hiệu ứng cho phần tử nào thay vì nhìn 1 mã khó hiểu.
let idCounter = 0;
const newElementId = (type: string) => `${type}-${++idCounter}`;

const NO_ALIGN_TYPES = new Set<string>([ECustomElementType.SPACER, ECustomElementType.DIVIDER]);

/**
 * Khối "Tự tạo" kiểu Notion — ghép dần từng phần tử (tiêu đề/chữ/ảnh/nút/khoảng
 * trắng/gạch ngang), kéo sắp xếp lại tự do, để tự dựng bố cục riêng thay vì bị bó
 * buộc vào 1 khối định sẵn. Mỗi phần tử có `id` ổn định — Inspector › Tab Hiệu ứng
 * dùng chính id đó làm animation target, nên phần tử nào cũng gắn hiệu ứng riêng
 * được, không chỉ những khối có sẵn.
 */
export function CustomBlockElementsInput() {
    const { value, onChange } = createControl<CustomBlockElement[]>('object_array', {});
    const elements = () => value() || [];

    // Mutate tại chỗ (giữ nguyên reference) — DragList's <For> key theo reference
    // (xem stableKey() trong DragList.tsx); tạo object mới cho dòng đang gõ sẽ khiến
    // <For> unmount+remount cả dòng mỗi phím gõ, làm mất focus/nội dung đang nhập.
    const updateEl = (index: number, patch: Partial<CustomBlockElement>) => {
        const next = [...elements()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const addEl = (type: CustomBlockElement['type']) => onChange([...elements(), { id: newElementId(type), type, align: 'left' }]);
    const removeEl = (index: number) => {
        const next = [...elements()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-3">
            <DragList items={elements()} onReorder={onChange} class="space-y-3">
                {(el, index) => (
                    <div class="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                        <div class="flex items-start gap-2">
                            <DragHandle />
                            <div class="grid flex-1 grid-cols-12 gap-3">
                                <div class="col-span-6">
                                    <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.customBlock.elementType')}</p>
                                    <Select
                                        value={el.type}
                                        onChange={(v: string) => updateEl(index(), { type: v as CustomBlockElement['type'] })}
                                        options={ELEMENT_TYPE_OPTIONS()}
                                        fieldless
                                    />
                                </div>
                                <Show when={!NO_ALIGN_TYPES.has(el.type)}>
                                    <div class="col-span-6">
                                        <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.customBlock.align')}</p>
                                        <Select
                                            value={el.align || 'left'}
                                            onChange={(v: string) => updateEl(index(), { align: v as CustomBlockElement['align'] })}
                                            options={ALIGN_OPTIONS()}
                                            fieldless
                                        />
                                    </div>
                                </Show>
                            </div>
                            <Button
                                sm
                                outline
                                interactDanger
                                icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.builder.customBlock.removeElement')} />}
                                onClick={() => removeEl(index())}
                            />
                        </div>

                        <Show when={el.type === ECustomElementType.HEADING}>
                            <div class="grid grid-cols-12 gap-3">
                                <div class="col-span-4">
                                    <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.builder.customBlock.headingSize')}</p>
                                    <Select
                                        value={el.level || 'h2'}
                                        onChange={(v: string) => updateEl(index(), { level: v as CustomBlockElement['level'] })}
                                        options={HEADING_LEVEL_OPTIONS()}
                                        fieldless
                                    />
                                </div>
                                <div class="col-span-8">
                                    <Input value={el.text} onChange={(v: string) => updateEl(index(), { text: v })} placeholder={t('cms.builder.customBlock.headingPlaceholder')} fieldless />
                                </div>
                            </div>
                        </Show>

                        <Show when={el.type === ECustomElementType.TEXT}>
                            <Textarea value={el.text} onChange={(v: string) => updateEl(index(), { text: v })} rows={3} placeholder={t('cms.builder.customBlock.textPlaceholder')} fieldless />
                        </Show>

                        <Show when={el.type === ECustomElementType.IMAGE}>
                            <InputImage
                                value={el.image}
                                onChange={(v: string | string[] | null) => updateEl(index(), { image: typeof v === 'string' ? v : undefined })}
                                fieldless
                            />
                        </Show>

                        <Show when={el.type === ECustomElementType.BUTTON}>
                            <div class="grid grid-cols-2 gap-3">
                                <Input value={el.text} onChange={(v: string) => updateEl(index(), { text: v })} placeholder={t('cms.builder.customBlock.buttonLabelPlaceholder')} fieldless />
                                <Input value={el.href} onChange={(v: string) => updateEl(index(), { href: v })} placeholder="/lien-he" fieldless />
                            </div>
                        </Show>

                        <Show when={el.type === ECustomElementType.SPACER}>
                            <Select
                                value={el.spacing || 'md'}
                                onChange={(v: string) => updateEl(index(), { spacing: v as CustomBlockElement['spacing'] })}
                                options={SPACING_OPTIONS()}
                                fieldless
                            />
                        </Show>
                    </div>
                )}
            </DragList>

            <div class="flex flex-wrap gap-2">
                {ELEMENT_TYPE_OPTIONS().map((opt) => (
                    <Button sm outline onClick={() => addEl(opt.value as CustomBlockElement['type'])}>
                        + {opt.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
