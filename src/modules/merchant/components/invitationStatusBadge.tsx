// src/modules/merchant/components/InvitationStatusBadge.tsx

import { Icon } from '@shared/components/icons/Icon';

import { EInvitationStatus, INVITATION_STATUS_CONFIG } from '../merchant.constants';

interface Props {
    status: EInvitationStatus;
}

/** Badge đầy đủ — dùng trong table column */
export function InvitationStatusBadge(props: Props) {
    const cfg = () =>
        INVITATION_STATUS_CONFIG[props.status] ?? INVITATION_STATUS_CONFIG[EInvitationStatus.PENDING];
    return (
        <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
            ${cfg().bg} ${cfg().text} ${cfg().border}`}>
            <Icon name={cfg().icon} class="w-3.5 h-3.5" />
            {cfg().label}
        </span>
    );
}

/** Badge nhỏ gọn — dùng trong CardView mobile */
export function InvitationStatusBadgeMini(props: Props) {
    const cfg = () =>
        INVITATION_STATUS_CONFIG[props.status] ?? INVITATION_STATUS_CONFIG[EInvitationStatus.PENDING];
    return (
        <span class={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border
            ${cfg().bg} ${cfg().text} ${cfg().border}`}>
            <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg().dot}`} />
            {cfg().label}
        </span>
    );
}