import { createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { IconRadioGroup } from '@core/components/control/IconRadioGroup';
import { PreviewDrawer } from '@core/components/utilities/PreviewDrawer';
import { useForm } from '@core/components/form/FormContext';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { HeaderPresetDTO, HeaderPresetService } from '@/shared/services/headerPreset/headerPreset.service';
import { MenuService } from '@/shared/services/menu/menu.service';
import { SiteHeader } from '@/modules/cms/chrome/SiteHeader';
import type { CreateHeaderPresetInput, UpdateHeaderPresetInput } from '@shared/generated/typed-graphql';
import { TwoFieldListInput } from './TwoFieldListInput';
import { AnimationTimelineField } from './AnimationTimelineField';
import { t } from '@/shared/i18n/t';

/** `CreateHeaderPresetInput`/`UpdateHeaderPresetInput` (codegen) type `cta` as a flat `string`
 * — the same "Mixed scalar → codegen `string`" limitation documented in headerPreset.service.ts's
 * `HeaderCta` narrowing (Task 2) — so `Datatable.Field`'s `FieldName<T>` can't derive nested
 * dotted paths (e.g. `cta.label`) from that flat-`string` type even though the form engine's
 * `Util.get`/`Util.set` (generateForm.tsx) genuinely walks any dotted path on the real runtime
 * object regardless of its declared type. Same convention as Theme Manager's `themeField()`. */
const headerPresetField = (name: string) => name as any;

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, HeaderPresetDTO, HeaderPresetDTO, HeaderPresetDTO, CreateHeaderPresetInput, UpdateHeaderPresetInput>({
    service: HeaderPresetService,
    paginatedQuery: () => HeaderPresetService.getAllHeaderPresetsCursor(),
    itemQuery: (item) => HeaderPresetService.getOneHeaderPreset({ id: item.id! }),
    createMutation: (data) => HeaderPresetService.createHeaderPreset({ data }),
    updateMutation: (id, data) => HeaderPresetService.updateHeaderPreset({ id, data }),
    deleteMutation: (item) => HeaderPresetService.deleteHeaderPreset({ id: item.id! }),
});

/** Nhiều bản ghi (thay singleton SiteSettings cũ) — mỗi Page tự chọn 1 header qua
 * dropdown trong form Page (mặc định để trống = dùng bản ghi isDefault=true ở đây),
 * cho phép nhiều trang dùng chung 1 header trong khi các trang khác dùng hẳn 1
 * header khác — xem PageResolver.resolveHeaderFooter phía backend. */
export function ManageHeaderPresetsPage() {
    // Menu Manager (Task 4/5, Phase 3) — Select "Menu" đặt CẠNH navLinks cũ (không xoá), admin
    // tự quyết định dùng cái nào; SiteHeader ưu tiên Menu nếu headerMenuId có giá trị.
    const [menus] = createResource(() => MenuService.getAllMenu());
    const menuOptions = () => (menus() || []).map((m) => ({ value: m.id!, label: m.name! }));

    const setDefault = async (item: HeaderPresetDTO) => {
        await HeaderPresetService.setDefaultHeaderPreset({ id: item.id! });
        toast().success(t('cms.headerPresets.setDefaultSuccess'));
        triggerRefresh();
    };

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="HeaderPresetTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.headerPresets.title')} description={t('cms.headerPresets.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.headerPresets.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.headerPresets.columns.name')}>
                            {(item) => (
                                <div class="flex items-center gap-2">
                                    <p class="font-semibold text-gray-900">{item.name}</p>
                                    {item.isDefault && (
                                        <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                            {t('cms.headerPresets.defaultBadge')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        visible={!item.isDefault}
                                        icon={<Icon name="heroicons-outline:check-circle" tooltip={t('cms.headerPresets.setDefaultButton')} />}
                                        onClick={() => setDefault(item)}
                                    />
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
                        createTitle={t('cms.headerPresets.createTitle')}
                        updateTitle={t('cms.headerPresets.updateTitle')}
                    >
                        {() => {
                            // IconRadioGroup below is standalone (not createControl/FieldContext-native —
                            // see its own header comment), wired manually via useForm() exactly like
                            // manageThemes.page.tsx's motion.signature does; SiteHeader preview reads the
                            // SAME value() reactively so it updates before saving.
                            const { value, setValues } = useForm();
                            return (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-12 flex justify-end">
                                    <PreviewDrawer title={t('cms.headerPresets.preview.title')} triggerLabel={t('cms.headerPresets.preview.button')} class="w-full sm:w-[720px]">
                                        <div class="rounded-lg bg-white">
                                            <SiteHeader
                                                currentPath="/"
                                                logoText={value('logoText')}
                                                navLinks={value('navLinks' as any)}
                                                headerMenuId={value('headerMenuId' as any)}
                                                bgVariant={value('bgVariant' as any)}
                                                layoutVariant={value('layoutVariant' as any)}
                                                cta={value(headerPresetField('cta'))}
                                                megaMenu={value('megaMenu' as any)}
                                                phone={value('phone' as any)}
                                            />
                                        </div>
                                    </PreviewDrawer>
                                </div>
                                <div class="col-span-8">
                                    <Datatable.Field name="name" label={t('cms.headerPresets.fields.name')} required>
                                        <Input placeholder={t('cms.headerPresets.fields.namePlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="logoText" label={t('cms.headerPresets.fields.logoText')}>
                                        <Input placeholder="Catbox" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="navLinks" label={t('cms.headerPresets.fields.navLinks')}>
                                        <TwoFieldListInput
                                            field1Key="label"
                                            field1Label={t('cms.headerPresets.fields.navLinkLabel')}
                                            field2Key="href"
                                            field2Label={t('cms.headerPresets.fields.navLinkHref')}
                                            addLabel={t('cms.headerPresets.fields.addNavLink')}
                                        />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field
                                        name="headerMenuId"
                                        label={t('cms.headerPresets.fields.headerMenuId')}
                                        description={t('cms.headerPresets.fields.headerMenuIdHint')}
                                    >
                                        <Select options={menuOptions()} clearable />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="animation" label={t('cms.headerPresets.fields.animation')}>
                                        <AnimationTimelineField />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-6">
                                    <label class="mb-1.5 block text-sm font-medium text-neutral-700">{t('cms.headerPresets.fields.bgVariant')}</label>
                                    <IconRadioGroup
                                        value={value('bgVariant' as any)}
                                        options={[
                                            { value: 'solid', label: t('cms.headerPresets.fields.bgVariantSolid'), icon: 'heroicons-outline:stop' },
                                            { value: 'transparent-overlay', label: t('cms.headerPresets.fields.bgVariantTransparentOverlay'), icon: 'heroicons-outline:eye' },
                                            { value: 'blur', label: t('cms.headerPresets.fields.bgVariantBlur'), icon: 'heroicons-outline:color-swatch' },
                                        ]}
                                        onChange={(v) => setValues('bgVariant' as any, v)}
                                    />
                                </div>
                                <div class="col-span-6">
                                    <label class="mb-1.5 block text-sm font-medium text-neutral-700">{t('cms.headerPresets.fields.layoutVariant')}</label>
                                    <IconRadioGroup
                                        value={value('layoutVariant' as any)}
                                        options={[
                                            { value: 'logo-left', label: t('cms.headerPresets.fields.layoutVariantLogoLeft'), icon: 'heroicons-outline:menu-alt-2' },
                                            { value: 'centered', label: t('cms.headerPresets.fields.layoutVariantCentered'), icon: 'heroicons-outline:template' },
                                            { value: 'split', label: t('cms.headerPresets.fields.layoutVariantSplit'), icon: 'heroicons-outline:switch-horizontal' },
                                        ]}
                                        onChange={(v) => setValues('layoutVariant' as any, v)}
                                    />
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name={headerPresetField('cta.label')} label={t('cms.headerPresets.fields.ctaLabel')}>
                                        <Input />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name={headerPresetField('cta.href')} label={t('cms.headerPresets.fields.ctaHref')}>
                                        <Input placeholder="/lien-he" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <label class="mb-1.5 block text-sm font-medium text-neutral-700">{t('cms.headerPresets.fields.ctaVariant')}</label>
                                    <IconRadioGroup
                                        value={value(headerPresetField('cta.variant'))}
                                        options={[
                                            { value: 'primary', label: t('cms.headerPresets.fields.ctaVariantPrimary'), icon: 'heroicons-solid:cursor-click' },
                                            { value: 'secondary', label: t('cms.headerPresets.fields.ctaVariantSecondary'), icon: 'heroicons-outline:cursor-click' },
                                        ]}
                                        onChange={(v) => setValues(headerPresetField('cta.variant'), v)}
                                    />
                                </div>
                                <div class="col-span-8">
                                    <Datatable.Field name="megaMenu" label={t('cms.headerPresets.fields.megaMenu')}>
                                        <Checkbox />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="phone" label={t('cms.headerPresets.fields.phone')}>
                                        <Input placeholder="0909 123 456" />
                                    </Datatable.Field>
                                </div>
                            </div>
                            );
                        }}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
