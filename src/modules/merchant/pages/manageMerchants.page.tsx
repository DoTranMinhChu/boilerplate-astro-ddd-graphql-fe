// src/modules/merchant/pages/ManageMerchantsPage.tsx
// SUPER_ADMIN xem và quản lý toàn bộ Merchant trong hệ thống

import { writeClipboard } from '@solid-primitives/clipboard';
import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { Avatar } from '@core/components/utilities/Avatar';
import { Show } from 'solid-js';
import { formatDatetime } from '@/core/helpers/date';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { generatePassword } from '@core/helpers/util';
import {
    MerchantDTO,
    MerchantService,
} from '@/shared/services/merchant/merchant.service';
import { AdminService } from '@/shared/services/admin/admin.service';
import { CreateMerchantInput, UpdateMerchantInput } from '@/shared/generated/typed-graphql';


export function ManageMerchantsPage() {
    const { Datatable } = generateDatatable<
        PagingArgsInput,
        MerchantDTO,
        MerchantDTO,
        MerchantDTO,
        CreateMerchantInput,
        UpdateMerchantInput
    >({
        service: MerchantService,
        paginatedQuery: MerchantService.getAllMerchant,
        queryInput: { sort: { createdAt: 'DESC' } },
        itemQuery: (item) => MerchantService.getOneMerchant({ id: item.id! }),
        createMutation: (data) => MerchantService.createMerchant({ data }),
        updateMutation: (id, data) => MerchantService.updateMerchant({ id, data }),

    });

    return (
        <div class="space-y-6 animate-in">
            <Card>
                <Datatable id="MerchantsTable">

                    <Datatable.Header>
                        <Datatable.Title
                            title="Quản lý nhân sự"
                            description="Danh sách toàn bộ tài khoản nhân sự trong hệ thống"
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label="Thêm nhân sự" />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    {/* ── Desktop Table ──────────────────────────────────────── */}
                    <Datatable.Table>

                        <Datatable.Column title="Nhân sự">
                            {(item) => (
                                <div class="flex items-center gap-3">
                                    <Avatar text={item.fullname ?? item.username} size="small" />
                                    <div>
                                        <p class="font-semibold text-sm text-neutral-900">
                                            {item.fullname ?? '—'}
                                        </p>
                                        <p class="text-xs text-gray-400">@{item.username}</p>
                                    </div>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Email">
                            {(item) => (
                                <span class="text-sm text-gray-600">
                                    {item.email ?? <span class="text-gray-300 italic">Chưa có</span>}
                                </span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Điện thoại">
                            {(item) => item.phone ?? <span class="text-gray-300 italic text-sm">—</span>}
                        </Datatable.Column>

                        <Datatable.Column title="Trạng thái">
                            {(item) => (
                                <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
                                    ${item.isActivated
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                    <span class={`w-1.5 h-1.5 rounded-full ${item.isActivated ? 'bg-green-500' : 'bg-red-400'}`} />
                                    {item.isActivated ? 'Hoạt động' : 'Bị khóa'}
                                </span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Ngày đăng ký">
                            {(item) => (
                                <span class="text-sm text-gray-500">
                                    {formatDatetime(item.createdAt!, 'date')}
                                </span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Đăng nhập lần cuối">
                            {(item) => item.lastLoginAt
                                ? <span class="text-sm text-gray-500">{formatDatetime(item.lastLoginAt, 'datetime')}</span>
                                : <span class="text-gray-300 italic text-xs">Chưa đăng nhập</span>
                            }
                        </Datatable.Column>

                        <Datatable.Column right fitContent>
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        icon={<Icon name="heroicons-outline:key" class="w-4 h-4" />}
                                        onClick={async () => {
                                            const result = await confirmAction().question(`Reset mật khẩu cho ${item.fullname || item.username}?`);
                                            if (result) {
                                                const newPass = generatePassword(12);
                                                await toast().api(async () => {
                                                    await AdminService.adminResetMerchantPassword({
                                                        input: { targetId: item.id!, newPassword: newPass }
                                                    });
                                                    await writeClipboard(newPass);
                                                }, { successMessage: 'Đã reset mật khẩu và copy vào clipboard!' });
                                            }
                                        }}
                                    />
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.fullname ?? item.username} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>

                    </Datatable.Table>

                    {/* ── Mobile CardView ────────────────────────────────────── */}
                    <Datatable.CardView>
                        {(item) => (
                            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                                <div class="p-4 flex items-start gap-3">
                                    <Avatar text={item.fullname ?? item.username} size="small" />
                                    <div class="flex-1 min-w-0 space-y-1.5">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <p class="font-bold text-neutral-900 text-sm truncate">
                                                {item.fullname ?? item.username}
                                            </p>
                                            <span class={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border
                                                ${item.isActivated
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-red-50 text-red-600 border-red-200'
                                                }`}>
                                                <span class={`w-1.5 h-1.5 rounded-full ${item.isActivated ? 'bg-green-500' : 'bg-red-400'}`} />
                                                {item.isActivated ? 'Hoạt động' : 'Bị khóa'}
                                            </span>
                                        </div>
                                        <p class="text-xs text-gray-400">@{item.username}</p>
                                        <Show when={item.email}>
                                            <p class="text-xs text-gray-500 flex items-center gap-1">
                                                <Icon name="heroicons-outline:mail" class="w-3.5 h-3.5 text-gray-400" />
                                                {item.email}
                                            </p>
                                        </Show>
                                        <Show when={item.phone}>
                                            <p class="text-xs text-gray-500 flex items-center gap-1">
                                                <Icon name="heroicons-outline:phone" class="w-3.5 h-3.5 text-gray-400" />
                                                {item.phone}
                                            </p>
                                        </Show>
                                        <p class="text-xs text-gray-400">
                                            Đăng ký: {formatDatetime(item.createdAt!, 'date')}
                                        </p>
                                    </div>
                                </div>
                                <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                                    <Datatable.CellButtons>
                                        <Datatable.CellButtonUpdate item={item} />
                                        <Datatable.CellButtonDelete item={item} itemName={item.fullname ?? item.username} />
                                    </Datatable.CellButtons>
                                </div>
                            </div>
                        )}
                    </Datatable.CardView>

                    <Datatable.Pagination />

                    {/* ── Form ──────────────────────────────────────────────── */}
                    <Datatable.Formlog viewMode="modal" class="w-full max-w-[560px]">
                        {(item) => (
                            <div class="col-span-full grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 sm:p-6">

                                <div class="col-span-full sm:col-span-8">
                                    <Datatable.Field name="fullname" label="Họ và tên">
                                        <Input placeholder="Nguyễn Văn A" />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-full sm:col-span-6">
                                    <Datatable.Field name="username" label="Tên đăng nhập" required disabled={!!item}>
                                        <Input placeholder="nguyenvana" />
                                    </Datatable.Field>
                                </div>

                                <Show when={!item}>
                                    <div class="col-span-full sm:col-span-6">
                                        <Datatable.Field name="password" label="Mật khẩu" required>
                                            <Input type="password" placeholder="••••••••" />
                                        </Datatable.Field>
                                    </div>
                                </Show>

                                <div class="col-span-full sm:col-span-7">
                                    <Datatable.Field name="email" label="Email">
                                        <Input type="email" placeholder="nva@example.com" />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-full sm:col-span-5">
                                    <Datatable.Field name="phone" label="Số điện thoại">
                                        <Input type="tel" placeholder="0901234567" />
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
