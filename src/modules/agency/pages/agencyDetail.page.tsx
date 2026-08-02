import { useNavigate } from '@solidjs/router';
import { createResource } from 'solid-js';

import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { AgencyService } from '@/shared/services/agency/agency.service';
import { Tabs } from '@/core/components/tab/Tabs';

import { AgencyAccountSection } from '../components/agencyAccountSection.component';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { Button } from '@/core/components/button/Button';
import { notifyResourceError } from '@core/helpers/resourceError';
import { t } from '@/shared/i18n/t';

export function AgencyDetailPage() {
    const { searchParams } = useRoutes();
    const navigate = useNavigate();
    const [agency] = createResource(() => searchParams.agencyId, (id) => AgencyService.getOneAgency(id));
    notifyResourceError(agency, t('agency.detail.loadError'));

    return (
        <div class="space-y-6 animate-in">
            <div class="flex items-center gap-4">
                <Button class="p-2 bg-white rounded-xl border shadow-sm hover:bg-gray-50" onClick={() => { navigate(-1) }}>
                    <Icon name="heroicons-outline:arrow-left" class="w-5 h-5 text-gray-500" />
                </Button>
                <div>
                    <h1 class="text-2xl font-black text-gray-900">{agency()?.name || '...'}</h1>
                    <p class="text-sm text-gray-500 font-medium">{t('agency.detail.subtitle')}</p>
                </div>
            </div>

            <Tabs id="AgencyDetailTabs">
                <Tabs.Tab label={t('agency.detail.infoTab')} icon={<Icon name="heroicons-outline:identification" />}>
                    <div class="mt-4">
                        <Card class="p-6 grid grid-cols-1 md:grid-cols-4 gap-8 bg-indigo-50/20 border-indigo-100">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('agency.detail.emailLabel')}</label>
                                <p class="font-bold text-indigo-700">{agency()?.contactEmail}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('agency.detail.codeLabel')}</label>
                                <p class="font-bold">{agency()?.code}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('agency.detail.taxCodeLabel')}</label>
                                <p class="font-bold">{agency()?.taxCode || t('agency.common.na')}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('agency.detail.websiteLabel')}</label>
                                <p class="font-bold text-blue-600 underline">{agency()?.website || t('agency.common.na')}</p>
                            </div>
                        </Card>
                        <AgencyAccountSection agencyId={searchParams?.agencyId!} />
                    </div>
                </Tabs.Tab>





                <Tabs.Tab label={t('agency.detail.renewalTab')} icon={<Icon name="heroicons-outline:credit-card" />}>
                    <Card class="mt-4 p-20 flex flex-col items-center justify-center border-dashed border-2">
                        <div class="p-4 bg-yellow-50 rounded-full mb-4">
                            <Icon name="heroicons-outline:clock" class="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 class="text-lg font-bold">{t('agency.detail.renewalComingSoonTitle')}</h3>
                        <p class="text-gray-500">{t('agency.detail.renewalComingSoonDescription')}</p>
                    </Card>
                </Tabs.Tab>
            </Tabs>
        </div>
    );
}