import { For, Show, JSX } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { Toggle } from '@core/components/control/Toggle';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { t } from '@/shared/i18n/t';
import type { SeoData, FieldDefinitionDTO } from '@/modules/cms/cms.types';

export interface PageSeoMappingPanelProps {
    seo?: SeoData;
    seoFieldMapping?: Record<string, string>;
    /** Field của Content Type gắn ở block CONTENT_DETAIL đầu tiên của trang — rỗng nếu
     * trang không có block Chi tiết nào (mapping vô nghĩa, chỉ còn input tĩnh có tác dụng). */
    detailFields: FieldDefinitionDTO[];
    onChangeSeo: (patch: Partial<SeoData>) => void;
    onChangeMapping: (patch: Record<string, string | undefined>) => void;
}

// `SeoData` (từ `CrudService.seoFragment`) hiện KHÔNG select `structuredData` (scalar Mixed,
// hiếm dùng — xem crud.service.ts) nên nó không nằm trong `keyof SeoData`. Panel này vẫn cho
// phép cấu hình MAPPING cho `structuredData` (không có input tĩnh, chỉ Select) mà không cần
// mở rộng fragment dùng chung cho toàn bộ CRUD service (ngoài phạm vi Task 6) — widen kiểu key
// cục bộ ở đây thay vì đổi `SeoData`.
type SeoKey = keyof SeoData;
type RowKey = SeoKey | 'structuredData';

/** Lọc field tương thích kiểu cho từng key SEO (mục δ design). `structuredData` không lọc
 * (hiếm dùng, admin tự chịu trách nhiệm nếu chọn field không phù hợp). */
function compatibleFields(key: RowKey, fields: FieldDefinitionDTO[]): FieldDefinitionDTO[] {
    switch (key) {
        case 'title':
        case 'description':
        case 'ogTitle':
        case 'ogDescription':
        case 'canonicalUrl':
        case 'sitemapChangeFreq':
            return fields.filter((f) => f.type === 'TEXT' || f.type === 'RICHTEXT');
        case 'ogImage':
        case 'twitterImage':
            return fields.filter((f) => f.type === 'IMAGE');
        case 'robotsIndex':
        case 'robotsFollow':
            return fields.filter((f) => f.type === 'BOOLEAN');
        case 'sitemapPriority':
            return fields.filter((f) => f.type === 'NUMBER');
        default:
            return fields;
    }
}

function fieldOptions(key: RowKey, fields: FieldDefinitionDTO[]) {
    return [
        { value: '', label: t('cms.builder.seoMapping.noMapping') },
        ...compatibleFields(key, fields).map((f) => ({ value: f.key!, label: f.label || f.key! })),
    ];
}

interface RowConfig {
    key: RowKey;
    label: string;
    /** Không có control tĩnh -> chỉ hiện Select mapping (dùng cho structuredData, hiếm dùng). */
    staticControl?: (value: unknown, onChange: (v: unknown) => void) => JSX.Element;
}

export function PageSeoMappingPanel(props: PageSeoMappingPanelProps) {
    const rows: RowConfig[] = [
        { key: 'title', label: t('cms.builder.seoMapping.title'), staticControl: (v, onChange) => <Input value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'description', label: t('cms.builder.seoMapping.description'), staticControl: (v, onChange) => <Textarea rows={2} value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'ogTitle', label: t('cms.builder.seoMapping.ogTitle'), staticControl: (v, onChange) => <Input value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'ogDescription', label: t('cms.builder.seoMapping.ogDescription'), staticControl: (v, onChange) => <Textarea rows={2} value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'ogImage', label: t('cms.builder.seoMapping.ogImage'), staticControl: (v, onChange) => <InputImage value={v as string} onChange={(val: string | string[] | null) => onChange(typeof val === 'string' ? val : undefined)} fieldless /> },
        { key: 'twitterImage', label: t('cms.builder.seoMapping.twitterImage'), staticControl: (v, onChange) => <InputImage value={v as string} onChange={(val: string | string[] | null) => onChange(typeof val === 'string' ? val : undefined)} fieldless /> },
        { key: 'robotsIndex', label: t('cms.builder.seoMapping.robotsIndex'), staticControl: (v, onChange) => <Toggle value={v !== false} onChange={(val: boolean) => onChange(val)} text={t('cms.builder.seoMapping.robotsIndexText')} textClass="text-xs text-neutral-600" fieldless /> },
        { key: 'robotsFollow', label: t('cms.builder.seoMapping.robotsFollow'), staticControl: (v, onChange) => <Toggle value={v !== false} onChange={(val: boolean) => onChange(val)} text={t('cms.builder.seoMapping.robotsFollowText')} textClass="text-xs text-neutral-600" fieldless /> },
        { key: 'canonicalUrl', label: t('cms.builder.seoMapping.canonicalUrl'), staticControl: (v, onChange) => <Input value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'sitemapPriority', label: t('cms.builder.seoMapping.sitemapPriority'), staticControl: (v, onChange) => <InputNumber value={(v as number) ?? null} onChange={(val: number | null) => onChange(val ?? undefined)} fieldless /> },
        { key: 'sitemapChangeFreq', label: t('cms.builder.seoMapping.sitemapChangeFreq'), staticControl: (v, onChange) => <Input value={(v as string) ?? ''} onChange={(val: string) => onChange(val)} fieldless /> },
        { key: 'structuredData', label: t('cms.builder.seoMapping.structuredData') },
    ];

    return (
        <div class="space-y-5">
            <p class="text-xs text-neutral-400">{t('cms.builder.seoMapping.hint')}</p>
            <For each={rows}>
                {(row) => (
                    <div class="space-y-1.5 border-b border-neutral-100 pb-4 last:border-0">
                        <p class="text-xs font-medium text-neutral-500">{row.label}</p>
                        <Show when={row.staticControl}>
                            {row.staticControl!((props.seo as Record<string, unknown> | undefined)?.[row.key], (v: unknown) => props.onChangeSeo({ [row.key]: v } as Partial<SeoData>))}
                        </Show>
                        <div>
                            <p class="mb-1 text-[11px] text-neutral-400">{t('cms.builder.seoMapping.mappingLabel')}</p>
                            <NativeSelect
                                value={props.seoFieldMapping?.[row.key] ?? ''}
                                onChange={(v: string) => props.onChangeMapping({ [row.key]: v || undefined })}
                                options={fieldOptions(row.key, props.detailFields)}
                                optionGroups={[]}
                                emptyPlaceholder=""
                                fieldless
                            />
                        </div>
                    </div>
                )}
            </For>
        </div>
    );
}
