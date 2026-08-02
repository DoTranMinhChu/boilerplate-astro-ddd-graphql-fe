import { createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { TenantService } from '@/shared/services/tenant/tenant.service';
import { toast } from '@core/components/toast/ToastProvider';
import { createStore } from 'solid-js/store';
import { InputImage } from '@/core/components/control/InputImage';
import { notifyResourceError } from '@core/helpers/resourceError';
import { t } from '@/shared/i18n/t';

export function TenantProfilePage() {
    // 1. Load Data
    const [data, { refetch }] = createResource(async () => {
        return await TenantService.getMyTenant();
    });
    notifyResourceError(data, t('tenant.profile.loadError'));

    const [form, setForm] = createStore<any>({});

    // Sync data to form when loaded
    createResource(() => data(), (val) => {
        if (val) setForm(JSON.parse(JSON.stringify(val)));
        return val;
    });

    const handleSave = async () => {
        try {
            await TenantService.updateTenant({
                id: data()!.id!,
                data: {
                    name: form.name,
                    contactEmail: form.contactEmail,
                    taxCode: form.taxCode,
                    website: form.website,
                    // logo: form.logo // Nếu API hỗ trợ update logo
                }
            });
            toast().success(t('tenant.profile.saveSuccess'));
            refetch();
        } catch (error) {
            toast().danger(t('tenant.profile.saveError'));
        }
    };

    return (
        <div class="max-w-4xl mx-auto space-y-6 animate-in">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-black text-gray-900">{t('tenant.profile.title')}</h1>
                    <p class="text-sm text-gray-500">{t('tenant.profile.subtitle')}</p>
                </div>
                <Button onClick={handleSave} class="bg-blue-600 text-white shadow-lg hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold flex gap-2">
                    <Icon name="heroicons-solid:save" /> {t('tenant.profile.saveButton')}
                </Button>
            </div>

            <Card class="p-8 border-none shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Logo Section */}
                <div class="md:col-span-4 flex flex-col items-center gap-4">
                    <div class="w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                        {/* Placeholder Input Image Component */}
                        <InputImage
                            medias={form.logo}
                            
                        />
                    </div>
                    <p class="text-xs text-center text-gray-400">{t('tenant.profile.logoFormat')}<br />{t('tenant.profile.logoMaxSize')}</p>
                </div>

                {/* Info Section */}
                <div class="md:col-span-8 space-y-5">
                    <div class="grid grid-cols-2 gap-5">
                        <div class="col-span-2">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">{t('tenant.profile.nameLabel')}</label>
                            <Input value={form.name} onChange={(v) => setForm('name', v)} class="font-bold text-lg" />
                        </div>

                        <div class="col-span-1">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">{t('tenant.profile.codeLabel')}</label>
                            <Input value={form.code} readOnly class="bg-gray-50 text-gray-500 cursor-not-allowed" />
                        </div>

                        <div class="col-span-1">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">{t('tenant.profile.taxCodeLabel')}</label>
                            <Input value={form.taxCode} onChange={(v) => setForm('taxCode', v)} />
                        </div>

                        <div class="col-span-2">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">{t('tenant.profile.emailLabel')}</label>
                            <Input value={form.contactEmail} onChange={(v) => setForm('contactEmail', v)} />
                        </div>

                        <div class="col-span-2">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">{t('tenant.profile.websiteLabel')}</label>
                            <Input value={form.website} onChange={(v) => setForm('website', v)} prefix={<Icon name="heroicons-outline:globe-alt" />} />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}