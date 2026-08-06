import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { FooterPresetDTO, FooterPresetService } from '@/shared/services/footerPreset/footerPreset.service';
import type { CreateFooterPresetInput, UpdateFooterPresetInput } from '@shared/generated/typed-graphql';
import { FooterColumnsInput } from './FooterColumnsInput';
import { AnimationLayerArrayInput } from './AnimationLayerArrayInput';
import { t } from '@/shared/i18n/t';

const ANIMATION_TARGETS = ['logo', 'contact', 'heading', 'columns', 'outlineText'];

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, FooterPresetDTO, FooterPresetDTO, FooterPresetDTO, CreateFooterPresetInput, UpdateFooterPresetInput>({
    service: FooterPresetService,
    paginatedQuery: () => FooterPresetService.getAllFooterPresetsCursor(),
    itemQuery: (item) => FooterPresetService.getOneFooterPreset({ id: item.id! }),
    createMutation: (data) => FooterPresetService.createFooterPreset({ data }),
    updateMutation: (id, data) => FooterPresetService.updateFooterPreset({ id, data }),
    deleteMutation: (item) => FooterPresetService.deleteFooterPreset({ id: item.id! }),
});

/** Nhiều bản ghi (thay singleton SiteSettings cũ) — mỗi Page tự chọn 1 footer qua
 * dropdown trong form Page (mặc định để trống = dùng bản ghi isDefault=true ở đây),
 * cho phép nhiều trang dùng chung 1 footer trong khi các trang khác dùng hẳn 1
 * footer khác — xem PageResolver.resolveHeaderFooter phía backend. */
export function ManageFooterPresetsPage() {
    const setDefault = async (item: FooterPresetDTO) => {
        await FooterPresetService.setDefaultFooterPreset({ id: item.id! });
        toast().success(t('cms.footerPresets.setDefaultSuccess'));
        triggerRefresh();
    };

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="FooterPresetTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.footerPresets.title')} description={t('cms.footerPresets.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.footerPresets.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.footerPresets.columns.name')}>
                            {(item) => (
                                <div class="flex items-center gap-2">
                                    <p class="font-semibold text-gray-900">{item.name}</p>
                                    {item.isDefault && (
                                        <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                            {t('cms.footerPresets.defaultBadge')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    {!item.isDefault && (
                                        <Datatable.CellButton
                                            sm
                                            icon={<Icon name="heroicons-outline:check-circle" tooltip={t('cms.footerPresets.setDefaultButton')} />}
                                            onClick={() => setDefault(item)}
                                        />
                                    )}
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[680px]"
                        createTitle={t('cms.footerPresets.createTitle')}
                        updateTitle={t('cms.footerPresets.updateTitle')}
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-8">
                                    <Datatable.Field name="name" label={t('cms.footerPresets.fields.name')} required>
                                        <Input placeholder={t('cms.footerPresets.fields.namePlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="logoText" label={t('cms.footerPresets.fields.logoText')}>
                                        <Input placeholder="Catbox" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-6">
                                    <Datatable.Field name="hotlineLabel" label={t('cms.footerPresets.fields.hotlineLabel')}>
                                        <Input />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-6">
                                    <Datatable.Field name="hotline" label={t('cms.footerPresets.fields.hotline')}>
                                        <Input />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="footerHeading" label={t('cms.footerPresets.fields.footerHeading')}>
                                        <Textarea rows={2} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="footerEmail" label={t('cms.footerPresets.fields.footerEmail')}>
                                        <Input />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="footerColumns" label={t('cms.footerPresets.fields.footerColumns')}>
                                        <FooterColumnsInput />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field
                                        name="footerOutlineText"
                                        label={t('cms.footerPresets.fields.footerOutlineText')}
                                        description={t('cms.footerPresets.fields.footerOutlineTextHint')}
                                    >
                                        <Input />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="animation" label={t('cms.footerPresets.fields.animation')}>
                                        <AnimationLayerArrayInput targetOptions={ANIMATION_TARGETS} />
                                    </Datatable.Field>
                                </div>
                            </div>
                        )}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
