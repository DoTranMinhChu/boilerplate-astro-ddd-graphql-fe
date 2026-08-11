import { For, Show, createResource, createSignal } from 'solid-js';
import { CellButton } from '@core/components/table/CellButton';
import { Button } from '@core/components/button/Button';
import { Slideout } from '@core/components/dialog/Slideout';
import { Icon } from '@shared/components/icons/Icon';
import { FormDTO, FormService } from '@/shared/services/form/form.service';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

/** Ghi 1 ô CSV an toàn — bọc "..." và escape dấu " khi giá trị chứa dấu phẩy/xuống dòng/dấu ",
 * theo đúng quy tắc RFC 4180 tối thiểu cần cho việc xuất Excel/Sheets mở lại không lệch cột. */
function escapeCsvCell(v: unknown): string {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: string[][]) {
    // "﻿" (BOM) đầu file -- không có BOM, Excel (khác Sheets/LibreOffice) tự đoán sai
    // encoding của file UTF-8 thuần và hiển thị sai ký tự có dấu (rất quan trọng với dữ liệu
    // tiếng Việt nhập từ form công khai).
    const csv = '﻿' + rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export interface FormSubmissionsPanelProps {
    form: FormDTO;
}

/**
 * Nút "Xem submissions" (mục 1 kế hoạch Phase 4, Task 4) — mở Slideout hiển thị toàn bộ
 * FormSubmission của 1 Form (BE trả mảng thẳng, không phân trang — `FormService.
 * getAllFormSubmission`, xem comment ở form.service.ts) + nút "Xuất CSV" build file CSV
 * client-side từ dữ liệu đã tải (không cần endpoint export riêng ở BE). Cùng khuôn fetch-lười-khi-
 * mở với ContentEntryUsagePanel.tsx (chỉ gọi API lần đầu mở panel, không tốn N query cho N dòng
 * datatable Form khi vào trang).
 */
export function FormSubmissionsPanel(props: FormSubmissionsPanelProps) {
    const [open, setOpen] = createSignal(false);
    const [submissions, { refetch }] = createResource(
        () => (open() ? props.form.id : undefined),
        (formId) => FormService.getAllFormSubmission({ formId: formId! }),
    );

    // Chỉ hiện cột theo field CẤP CAO NHẤT của Form (không đệ quy itemFields của REPEATER --
    // 1 ô bảng không đủ chỗ hiển thị hợp lý 1 danh sách lồng, và CSV cũng chỉ cần đủ để đối
    // soát nhanh, không phải bản in đầy đủ 1-1 mọi field lồng).
    const columns = () => (props.form.fields || []).filter((f): f is FieldDefinitionDTO => !!f?.key);

    const rowValue = (data: unknown, key: string) => (data as Record<string, unknown> | undefined)?.[key];

    const handleExportCsv = () => {
        const cols = columns();
        const header = [t('cms.forms.submissions.columnSubmittedAt'), ...cols.map((c) => c.label || c.key || '')];
        const rows = (submissions() || []).map((s) => [
            s?.createdAt || '',
            ...cols.map((c) => {
                const v = rowValue(s?.data, c.key!);
                return v === null || v === undefined ? '' : v;
            }),
        ]);
        downloadCsv(`${props.form.key || props.form.id}-submissions.csv`, [header, ...(rows as unknown as string[][])]);
    };

    return (
        <>
            <CellButton
                onClick={() => setOpen(true)}
                icon={<Icon name="heroicons-outline:inbox" tooltip={t('cms.forms.submissionsButton')} />}
            />
            <Slideout id={`form-submissions-${props.form.id}`} isOpen={open()} onClose={() => setOpen(false)} class="w-full max-w-[1100px]">
                <Slideout.Header title={t('cms.forms.submissions.panelTitle', { label: props.form.label || '' })} hasClose />
                <Slideout.Body class="p-5">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <Button sm outline icon={<Icon name="heroicons-outline:arrow-path" />} onClick={() => refetch()}>
                            {t('cms.forms.submissions.refreshButton')}
                        </Button>
                        <Button
                            sm
                            icon={<Icon name="heroicons-outline:download" />}
                            disabled={!(submissions() || []).length}
                            onClick={handleExportCsv}
                        >
                            {t('cms.forms.submissions.exportCsvButton')}
                        </Button>
                    </div>

                    <Show when={!submissions.loading} fallback={
                        <div class="py-10 text-center text-sm text-neutral-400">{t('cms.forms.submissions.loading')}</div>
                    }>
                        <Show when={(submissions() || []).length > 0} fallback={
                            <div class="py-10 text-center text-sm text-neutral-400">{t('cms.forms.submissions.empty')}</div>
                        }>
                            <div class="overflow-x-auto rounded-lg border border-neutral-200">
                                <table class="w-full text-sm">
                                    <thead class="bg-neutral-50">
                                        <tr>
                                            <th class="px-3 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">
                                                {t('cms.forms.submissions.columnSubmittedAt')}
                                            </th>
                                            <For each={columns()}>
                                                {(col) => (
                                                    <th class="px-3 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">{col.label}</th>
                                                )}
                                            </For>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <For each={submissions()}>
                                            {(s) => (
                                                <tr class="border-t border-neutral-100">
                                                    <td class="px-3 py-2 text-neutral-500 whitespace-nowrap">{s?.createdAt}</td>
                                                    <For each={columns()}>
                                                        {(col) => {
                                                            const v = rowValue(s?.data, col.key!);
                                                            return (
                                                                <td class="px-3 py-2 text-neutral-700 align-top">
                                                                    {v === null || v === undefined || v === ''
                                                                        ? '—'
                                                                        : typeof v === 'object'
                                                                            ? JSON.stringify(v)
                                                                            : String(v)}
                                                                </td>
                                                            );
                                                        }}
                                                    </For>
                                                </tr>
                                            )}
                                        </For>
                                    </tbody>
                                </table>
                            </div>
                        </Show>
                    </Show>
                </Slideout.Body>
            </Slideout>
        </>
    );
}
