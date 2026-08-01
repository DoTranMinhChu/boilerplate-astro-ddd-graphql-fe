// src/shared/components/activityLog/activityLog.meta.ts
//
// Ánh xạ action (string) → nhãn + icon + màu để hiển thị nhật ký hoạt động.
// Khớp với EActivityAction ở backend; có OTHER làm fallback an toàn.

export interface IActivityActionMeta {
    label: string;
    icon: string;
    chip: string; // class cho chip nhãn
    dot: string;  // class nền cho chấm timeline
}

export const ACTIVITY_ACTION_META: Record<string, IActivityActionMeta> = {
    CREATE: { label: 'Tạo mới', icon: 'heroicons-outline:plus', chip: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
    UPDATE: { label: 'Cập nhật', icon: 'heroicons-outline:pencil', chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    DELETE: { label: 'Xóa', icon: 'heroicons-outline:trash', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    STATUS_CHANGE: { label: 'Đổi trạng thái', icon: 'heroicons-outline:refresh', chip: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
    SUBMIT: { label: 'Gửi hồ sơ', icon: 'heroicons-outline:paper-airplane', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
    APPROVE: { label: 'Được duyệt', icon: 'heroicons-outline:check-circle', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    REJECT: { label: 'Bị từ chối', icon: 'heroicons-outline:x-circle', chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
    HANDOVER: { label: 'Bàn giao tem', icon: 'heroicons-outline:tag', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    ACTIVATE: { label: 'Kích hoạt tem', icon: 'heroicons-outline:badge-check', chip: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
    SCAN: { label: 'Quét tem', icon: 'heroicons-outline:qrcode', chip: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
    SYNC: { label: 'Đồng bộ', icon: 'heroicons-outline:arrow-path', chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
    ROLE_CHANGE: { label: 'Đổi vai trò', icon: 'heroicons-outline:identification', chip: 'bg-fuchsia-50 text-fuchsia-700', dot: 'bg-fuchsia-500' },
    PERMISSION_CHANGE: { label: 'Đổi phân quyền', icon: 'heroicons-outline:key', chip: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
    LOGIN: { label: 'Đăng nhập', icon: 'heroicons-outline:login', chip: 'bg-slate-50 text-slate-700', dot: 'bg-slate-500' },
    OTHER: { label: 'Hoạt động', icon: 'heroicons-outline:dots-horizontal', chip: 'bg-slate-50 text-slate-700', dot: 'bg-slate-400' },
};

/** Danh sách action để render dropdown filter. */
export const ACTIVITY_ACTION_FILTER_OPTIONS: { value: string; label: string }[] = Object.entries(
    ACTIVITY_ACTION_META,
)
    .filter(([k]) => k !== 'OTHER')
    .map(([value, meta]) => ({ value, label: meta.label }));

export function formatActivityTime(iso?: string | Date): string {
    if (!iso) return '';
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}
