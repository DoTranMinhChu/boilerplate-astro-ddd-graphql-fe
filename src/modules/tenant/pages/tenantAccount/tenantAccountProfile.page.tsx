import { createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { createStore } from 'solid-js/store';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';

export function TenantAccountProfilePage() {
    // 1. Load Data
    const [data, { refetch }] = createResource(async () => {
        return await TenantAccountService.getMyTenantAccount();
    });

    const [form, setForm] = createStore<any>({});

    // Sync data to form when loaded
    createResource(() => data(), (val) => {
        if (val) setForm(JSON.parse(JSON.stringify(val)));
        return val;
    });

    const handleSave = async () => {
        try {
            await TenantAccountService.updateTenantAccount({
                id: data()!.id!,
                data: {
                    fullname: form.fullname,

                    // logo: form.logo // Nếu API hỗ trợ update logo
                }
            });
            toast().success('Cập nhật thông tin thành công');
            refetch();
        } catch (error) {
            toast().danger('Cập nhật thất bại');
        }
    };

    return (
        <div class="max-w-4xl mx-auto space-y-6 animate-in">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-black text-gray-900">Hồ sơ tài khoản</h1>
                    <p class="text-sm text-gray-500">Thông tin hiển thị công khai và pháp lý</p>
                </div>
                <Button onClick={handleSave} class="bg-blue-600 text-white shadow-lg hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold flex gap-2">
                    <Icon name="heroicons-solid:save" /> Lưu thay đổi
                </Button>
            </div>

            <Card class="p-8 border-none shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Info Section */}
                <div class="md:col-span-8 space-y-5">
                    <div class="grid grid-cols-2 gap-5">
                        <div class="col-span-2">
                            <label class="text-xs font-bold text-gray-500 mb-1 block uppercase">Tên tài khoản</label>
                            <Input value={form.fullname} onChange={(v) => setForm('fullname', v)} class="font-bold text-lg" />
                        </div>


                    </div>
                </div>
            </Card>
        </div>
    );
}