// src/modules/merchant/components/InvitationActions.tsx
// Nút Accept / Reject lời mời — dùng ở table row (desktop) và CardView footer (mobile)

import { createSignal, Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';

import { MerchantInvitationService } from '@/shared/services/merchantInvitation/merchantInvitation.service';
import { toast } from '@core/components/toast/ToastProvider';
import { EInvitationStatus } from '@/shared/generated/typed-graphql';

interface Props {
    inviteCode: string;
    status: EInvitationStatus;
    /**
     * compact=true  → dùng trong CardView mobile
     *   - Nút từ chối: icon-only vuông
     *   - Nút chấp nhận: full-width
     * compact=false → dùng trong table row desktop
     *   - Cả hai là text button
     */
    compact?: boolean;
    onDone?: () => void;
}

export function InvitationActions(props: Props) {
    const [loading, setLoading] = createSignal(false);

    const handle = async (action: 'accept' | 'reject') => {
        setLoading(true);
        try {
            if (action === 'accept') {
                await MerchantInvitationService.acceptInvite({ input: { inviteCode: props.inviteCode } });
                toast().success('Đã chấp nhận lời mời!');
            } else {
                await MerchantInvitationService.rejectInvite({ input: { inviteCode: props.inviteCode } });
                toast().info('Đã từ chối lời mời.');
            }
            props.onDone?.();
        } catch (e: any) {
            toast().danger(e?.message ?? 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Chỉ render khi đang PENDING
    if (props.status !== EInvitationStatus.PENDING) return null;

    return (
        <Show
            when={props.compact}
            fallback={
                /* ── Desktop: 2 text button nhỏ ──── */
                <div class="flex items-center gap-1.5">
                    <button
                        onClick={() => handle('reject')}
                        disabled={loading()}
                        class="text-xs font-medium text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                        Từ chối
                    </button>
                    <button
                        onClick={() => handle('accept')}
                        disabled={loading()}
                        class="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Icon name="heroicons-solid:check" class="w-3.5 h-3.5" />
                        Chấp nhận
                    </button>
                </div>
            }
        >
            {/* ── Mobile compact: reject vuông + accept full-width ── */}
            <div class="flex items-center gap-2">
                <button
                    onClick={() => handle('reject')}
                    disabled={loading()}
                    class="w-9 h-9 rounded-lg border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-40 shrink-0"
                    aria-label="Từ chối"
                >
                    <Icon name="heroicons-solid:x" class="w-4 h-4" />
                </button>
                <button
                    onClick={() => handle('accept')}
                    disabled={loading()}
                    class="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors disabled:opacity-40"
                >
                    <Icon name="heroicons-solid:check" class="w-4 h-4" />
                    Chấp nhận
                </button>
            </div>
        </Show>
    );
}