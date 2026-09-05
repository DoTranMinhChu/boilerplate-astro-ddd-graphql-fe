import { Show, createResource, createSignal, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Button } from '@core/components/button/Button';
import { Select } from '@core/components/control/Select';
import { Tabs } from '@core/components/tab/Tabs';
import { toast } from '@core/components/toast/ToastProvider';
import { ContentEntryService, type ContentEntryDTO } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { renderControlledFieldControl } from '@/shared/components/fields/contentEntryFieldRenderer';
import { ContentVisibilityRulesInput } from './ContentVisibilityRulesInput';
import { shouldShowSeoTab } from './shouldShowSeoTab';
import type { FieldDefinitionDTO, FormConfig } from '@/modules/cms/cms.types';
import type { ContentVisibilityRuleInput } from '@shared/generated/typed-graphql';
import { t } from '@/shared/i18n/t';

const STATUS_OPTIONS = () => [
    { value: 'DRAFT', label: t('cms.contentEntries.status.draft') },
    { value: 'PUBLISHED', label: t('cms.contentEntries.status.published') },
    { value: 'UNPUBLISHED', label: t('cms.contentEntries.status.unpublished') },
];

const SEO_LIKE = (f: FieldDefinitionDTO) => {
    const key = (f?.key ?? '').toLowerCase();
    const label = (f?.label ?? '').toLowerCase();
    return key.includes('seo') || key.includes('meta') || label.includes('seo') || label.includes('meta');
};

/** "Trình soạn thảo (Full page)" / "Trình soạn thảo trực quan (Visual)" — đích của
 * CreateContentEntryModePicker (Task 12) khi content type bật formConfig.enabledModes
 * 'fullPage'/'visualGrid'. 3 tab cố định (mục D.3 design): Nội dung (mọi field, layout
 * stack/grid theo `searchParams.layout`), SEO (chỉ hiện khi content type có field liên quan
 * — `shouldShowSeoTab`), Hiển thị & Cài đặt (status của ĐÚNG entry này + luật ẩn/hiện của CẢ
 * content type, xem ghi chú ContentVisibilityRulesInput bên dưới). */
export function ManageContentEntryEditorPage() {
    const { searchParams, navigateToPage } = useRoutes();
    const contentTypeId = () => searchParams.contentTypeId as string;
    const entryId = () => searchParams.entryId as string;
    const layout = () => (searchParams.layout as 'stack' | 'grid') || 'stack';
    const isNew = () => entryId() === 'new';

    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentTypeAdmin({ id }));
    const [entry, { refetch }] = createResource(
        () => (isNew() ? undefined : entryId()),
        (id) => ContentEntryService.getOneContentEntry({ id }),
    );

    const [data, setData] = createSignal<Record<string, any>>({});
    const [status, setStatus] = createSignal('DRAFT');
    const [locale, setLocale] = createSignal('vi');
    const [visibilityRules, setVisibilityRules] = createSignal<ContentVisibilityRuleInput[]>([]);
    const [saving, setSaving] = createSignal(false);

    // Seed local form state once the entry (edit) resolves.
    const seedFromEntry = (e: ContentEntryDTO) => { setData(e.data as any ?? {}); setStatus(e.status!); setLocale(e.locale!); };
    createResource(entry, (e) => { if (e) seedFromEntry(e); return null; });

    // Seed content-type-level visibility rules once the content type resolves — this is a
    // ContentType setting (not per-entry), surfaced here for convenience (Hiển thị & Cài đặt
    // tab) so admin doesn't have to leave this page to tweak it. `getOneContentTypeAdmin`'s
    // fragment already carries `contentVisibilityRules` (contentType.service.ts's adminFragment)
    // — output shape ({field?,operator?,value?: string}) is structurally identical to the
    // ContentVisibilityRuleInput this control writes back on Save.
    const seedFromContentType = (ct: NonNullable<ReturnType<typeof contentType>>) => {
        setVisibilityRules((ct.contentVisibilityRules || []).filter((r): r is NonNullable<typeof r> => !!r));
    };
    createResource(contentType, (ct) => { if (ct) seedFromContentType(ct); return null; });

    // "Nhân bản" (Task 15) — chỉ áp dụng khi entryId='new' (chỗ duy nhất manageContentEntries.page.tsx
    // điều hướng tới với `duplicateFrom`). Full Page Editor chỉ đọc entryId='new', không có chỗ nào
    // trong URL chở nổi cả 1 object `data` đã nhân bản, nên dữ liệu được chuyển qua sessionStorage
    // khoá theo 1 id dùng 1 lần — đọc xong xoá ngay để không rò rỉ sang lượt "Tạo mới" (không nhân
    // bản) kế tiếp trên cùng entryId='new'.
    const duplicateFrom = () => searchParams.duplicateFrom as string | undefined;
    createResource(duplicateFrom, (id) => {
        if (!id) return null;
        const raw = sessionStorage.getItem(`content-entry-duplicate-${id}`);
        if (raw) { setData(JSON.parse(raw)); sessionStorage.removeItem(`content-entry-duplicate-${id}`); }
        return null;
    });

    const fields = () => (contentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
    const formConfig = () => contentType()?.formConfig as unknown as FormConfig | undefined;
    const showSeoTab = () => shouldShowSeoTab(fields());

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isNew()) {
                const created = await ContentEntryService.createContentEntry({
                    data: { contentTypeId: contentTypeId(), status: status() as any, locale: locale(), data: data() } as any,
                });
                toast().success(t('cms.contentEntries.createSuccess'));
                navigateToPage({ route: 'adminDashboard.cmsContentEntryEditor', context: { searchParams: { contentTypeId: contentTypeId(), entryId: created.id, layout: layout() } } });
            } else {
                await ContentEntryService.updateContentEntry({ id: entryId(), data: { status: status() as any, data: data() } as any });
                // Content-type-level setting, saved alongside the entry from this same button —
                // see ContentVisibilityRulesInput's controlled-mode doc comment for why this
                // can't just be an ambient Datatable.Field like manageContentTypes.page.tsx does.
                await ContentTypeService.updateContentType({ id: contentTypeId(), data: { contentVisibilityRules: visibilityRules() } });
                toast().success(t('cms.contentEntries.updateSuccess'));
                refetch();
            }
        } finally {
            setSaving(false);
        }
    };

    const setFieldValue = (key: string, value: any) => setData((d) => ({ ...d, [key]: value }));

    return (
        <Show when={contentType()} fallback={<div class="p-6 text-neutral-400">{t('cms.contentEntries.loading')}</div>}>
            <div class="space-y-4 animate-in">
                <div class="flex items-center justify-between">
                    <div>
                        <button class="text-sm text-neutral-400 hover:text-neutral-700" onClick={() => navigateToPage({ route: 'adminDashboard.cmsContentEntries', context: { searchParams: { contentTypeId: contentTypeId() } } })}>
                            &larr; {t('cms.contentEntries.backToList')}
                        </button>
                        <h1 class="text-xl font-bold text-neutral-900">{isNew() ? t('cms.contentEntries.createTitle') : t('cms.contentEntries.updateTitle')}</h1>
                    </div>
                    <Button onClick={handleSave} disabled={saving()}>{t('cms.contentEntries.saveButton')}</Button>
                </div>

                <Card class="border-none shadow-sm p-6">
                    <Tabs id="content-entry-full-page-tabs">
                        <Tabs.Tab label={t('cms.contentEntries.tabContent')}>
                            <div class={layout() === 'grid' ? 'grid grid-cols-12 gap-4 pt-3' : 'space-y-4 pt-3'}>
                                <For each={fields()}>
                                    {(field) => (
                                        <div style={layout() === 'grid' ? gridItemStyle(field, formConfig()?.gridLayout) : undefined}>
                                            <label class="mb-1 block text-sm font-medium text-neutral-700">{field.label}</label>
                                            {renderControlledFieldControl(field, data()[field.key!], (v: any) => setFieldValue(field.key!, v))}
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Tabs.Tab>

                        <Show when={showSeoTab()}>
                            <Tabs.Tab label={t('cms.contentEntries.tabSeo')}>
                                <div class="space-y-4 pt-3">
                                    <For each={fields().filter(SEO_LIKE)}>
                                        {(field) => (
                                            <div>
                                                <label class="mb-1 block text-sm font-medium text-neutral-700">{field.label}</label>
                                                {renderControlledFieldControl(field, data()[field.key!], (v: any) => setFieldValue(field.key!, v))}
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Tabs.Tab>
                        </Show>

                        <Tabs.Tab label={t('cms.contentEntries.tabDisplaySettings')}>
                            <div class="space-y-4 pt-3 max-w-sm">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-neutral-700">{t('cms.contentEntries.fields.status')}</label>
                                    <Select value={status()} onChange={setStatus} options={STATUS_OPTIONS()} fieldless />
                                </div>
                                <Show when={!isNew()}>
                                    <ContentVisibilityRulesInput
                                        fieldOptions={fields().map((f) => ({ value: f.key!, label: f.label || f.key! }))}
                                        value={visibilityRules()}
                                        onChange={setVisibilityRules}
                                    />
                                </Show>
                            </div>
                        </Tabs.Tab>
                    </Tabs>
                </Card>
            </div>
        </Show>
    );
}

function gridItemStyle(field: FieldDefinitionDTO, gridLayout: { fieldKey: string; colStart: number; colSpan: number; row: number }[] | undefined) {
    const placement = gridLayout?.find((g) => g.fieldKey === field.key);
    if (!placement) return undefined;
    return { 'grid-column': `${placement.colStart} / span ${placement.colSpan}`, 'grid-row': `${placement.row + 1}` };
}
