import { useNavigate } from '@solidjs/router';
import { createResource } from 'solid-js';

import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { AgencyService } from '@/shared/services/agency/agency.service';
import { Tabs } from '@/core/components/tab/Tabs';

import { AgencyAccountSection } from '../components/agencyAccountSection.component';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { Button } from '@/core/components/button/Button';

export function AgencyDetailPage() {
    const { searchParams } = useRoutes();
    const navigate = useNavigate();
    const [agency] = createResource(() => searchParams.agencyId, (id) => AgencyService.getOneAgency(id));

    return (
        <div class="space-y-6 animate-in">
            <div class="flex items-center gap-4">
                <Button class="p-2 bg-white rounded-xl border shadow-sm hover:bg-gray-50" onClick={() => { navigate(-1) }}>
                    <Icon name="heroicons-outline:arrow-left" class="w-5 h-5 text-gray-500" />
                </Button>
                <div>
                    <h1 class="text-2xl font-black text-gray-900">{agency()?.name || '...'}</h1>
                    <p class="text-sm text-gray-500 font-medium">Quản trị đối tác chiến lược</p>
                </div>
            </div>

            <Tabs id="AgencyDetailTabs">
                <Tabs.Tab label="Thông tin & Nhân sự" icon={<Icon name="heroicons-outline:identification" />}>
                    <div class="mt-4">
                        <Card class="p-6 grid grid-cols-1 md:grid-cols-4 gap-8 bg-indigo-50/20 border-indigo-100">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</label>
                                <p class="font-bold text-indigo-700">{agency()?.contactEmail}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mã định danh</label>
                                <p class="font-bold">{agency()?.code}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mã số thuế</label>
                                <p class="font-bold">{agency()?.taxCode || 'N/A'}</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Website</label>
                                <p class="font-bold text-blue-600 underline">{agency()?.website || 'N/A'}</p>
                            </div>
                        </Card>
                        <AgencyAccountSection agencyId={searchParams?.agencyId!} />
                    </div>
                </Tabs.Tab>





                <Tabs.Tab label="Lịch sử gia hạn" icon={<Icon name="heroicons-outline:credit-card" />}>
                    <Card class="mt-4 p-20 flex flex-col items-center justify-center border-dashed border-2">
                        <div class="p-4 bg-yellow-50 rounded-full mb-4">
                            <Icon name="heroicons-outline:clock" class="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 class="text-lg font-bold">Tính năng đang phát triển</h3>
                        <p class="text-gray-500">Hệ thống thanh toán và gia hạn đang được tích hợp.</p>
                    </Card>
                </Tabs.Tab>
            </Tabs>
        </div>
    );
}