import { For, Show, createEffect, createResource, createSignal } from 'solid-js';
import { CellButton } from '@core/components/table/CellButton';
import { Button } from '@core/components/button/Button';
import { Slideout } from '@core/components/dialog/Slideout';
import { Select } from '@core/components/control/Select';
import { Pagination } from '@core/components/pagination/Pagination';
import { baseConfig } from '@core/components/config/BaseConfig';
import { DEFAULT_LIMITS } from '@core/components/table/DatatablePagination';
import { formatNumber } from '@core/helpers/number';
import type { Edge } from '@core/api/types';
import { Icon } from '@shared/components/icons/Icon';
import { FormDTO, FormService, FormSubmissionDTO } from '@/shared/services/form/form.service';
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

// Cùng bộ limit với Datatable chuẩn (10/25/50/100) -- khớp default page size mới của BE (10).
const SUBMISSION_LIMIT_OPTIONS = DEFAULT_LIMITS;
// "Xuất CSV" phải lấy TOÀN BỘ submission (không chỉ trang đang xem), gộp nhiều dòng/request để
// giảm số round-trip; EXPORT_MAX_PAGES là ngưỡng an toàn tránh vòng lặp vô hạn nếu BE trả sai
// `hasNextPage` (2000 trang x 200 dòng = 400,000 dòng, thừa đủ mọi Form thực tế).
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_PAGES = 2000;

export interface FormSubmissionsPanelProps {
    form: FormDTO;
}

/**
 * Nút "Xem submissions" (mục 1 kế hoạch Phase 4, Task 4) — mở Slideout hiển thị FormSubmission
 * của 1 Form, PHÂN TRANG THẬT (BE Task 9 chuyển `getAllFormSubmission` sang `edges`/`pageInfo`,
 * mặc định 10 dòng/trang, sort `createdAt DESC` — xem comment ở form.service.ts). Bảng chỉ hiện
 * 1 trang tại 1 thời điểm (giống mọi Datatable admin khác trong codebase), nhưng nút "Xuất CSV"
 * vẫn xuất TOÀN BỘ submission của Form (lặp qua từng trang, xem `fetchAllSubmissionsForExport`)
 * để giữ đúng hành vi export trước đây. Cùng khuôn fetch-lười-khi-mở với
 * ContentEntryUsagePanel.tsx (chỉ gọi API lần đầu mở panel, không tốn N query cho N dòng
 * datatable Form khi vào trang).
 */
export function FormSubmissionsPanel(props: FormSubmissionsPanelProps) {
    const [open, setOpen] = createSignal(false);
    const [page, setPage] = createSignal(1);
    const [limit, setLimit] = createSignal(SUBMISSION_LIMIT_OPTIONS[0]);
    const [exportingCsv, setExportingCsv] = createSignal(false);

    const [result, { refetch }] = createResource(
        () => (open() ? { formId: props.form.id, page: page(), limit: limit() } : undefined),
        (args) => FormService.getAllFormSubmission({ formId: args.formId!, input: { page: args.page, limit: args.limit } }),
    );

    // Mỗi lần mở lại panel, luôn bắt đầu từ trang 1 -- tránh giữ nguyên trang cũ của lần xem
    // trước (có thể đã vượt quá tổng số trang hiện tại nếu dữ liệu đã thay đổi).
    createEffect(() => {
        if (open()) setPage(1);
    });

    const edges = () => ((result()?.edges || []) as Edge<FormSubmissionDTO>[]).filter((e) => !!e?.node);
    const rows = () => edges().map((e) => e.node!);
    const totalCount = () => result()?.pageInfo?.totalCount ?? 0;

    const changeLimit = (next: number) => {
        setLimit(next);
        setPage(1);
    };

    // Chỉ hiện cột theo field CẤP CAO NHẤT của Form (không đệ quy itemFields của REPEATER --
    // 1 ô bảng không đủ chỗ hiển thị hợp lý 1 danh sách lồng, và CSV cũng chỉ cần đủ để đối
    // soát nhanh, không phải bản in đầy đủ 1-1 mọi field lồng).
    const columns = () => (props.form.fields || []).filter((f): f is FieldDefinitionDTO => !!f?.key);

    const rowValue = (data: unknown, key: string) => (data as Record<string, unknown> | undefined)?.[key];

    const fetchAllSubmissionsForExport = async (): Promise<FormSubmissionDTO[]> => {
        const all: FormSubmissionDTO[] = [];
        for (let currentPage = 1; currentPage <= EXPORT_MAX_PAGES; currentPage++) {
            const res = await FormService.getAllFormSubmission({
                formId: props.form.id!,
                input: { page: currentPage, limit: EXPORT_PAGE_SIZE },
            });
            const nodes = ((res?.edges || []) as Edge<FormSubmissionDTO>[])
                .map((e) => e?.node)
                .filter((n): n is FormSubmissionDTO => !!n);
            all.push(...nodes);
            if (!res?.pageInfo?.hasNextPage || nodes.length === 0) break;
        }
        return all;
    };

    const handleExportCsv = async () => {
        setExportingCsv(true);
        try {
            const cols = columns();
            const header = [t('cms.forms.submissions.columnSubmittedAt'), ...cols.map((c) => c.label || c.key || '')];
            const all = await fetchAllSubmissionsForExport();
            const rowsForCsv = all.map((s) => [
                s?.createdAt || '',
                ...cols.map((c) => {
                    const v = rowValue(s?.data, c.key!);
                    return v === null || v === undefined ? '' : v;
                }),
            ]);
            downloadCsv(`${props.form.key || props.form.id}-submissions.csv`, [header, ...(rowsForCsv as unknown as string[][])]);
        } finally {
            setExportingCsv(false);
        }
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
                            disabled={exportingCsv() || totalCount() === 0}
                            onClick={handleExportCsv}
                        >
                            {exportingCsv() ? t('cms.forms.submissions.exportingCsvButton') : t('cms.forms.submissions.exportCsvButton')}
                        </Button>
                    </div>

                    <Show when={!result.loading} fallback={
                        <div class="py-10 text-center text-sm text-neutral-400">{t('cms.forms.submissions.loading')}</div>
                    }>
                        <Show when={rows().length > 0} fallback={
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
                                        <For each={rows()}>
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

                            <div class="mt-4 flex flex-wrap items-end gap-3">
                                <Select
                                    class="h-8"
                                    selectClass="text-sm"
                                    native
                                    value={limit()}
                                    onChange={(val) => changeLimit(Number(val))}
                                    options={SUBMISSION_LIMIT_OPTIONS.map((l) => ({ value: l, label: `${l} ${baseConfig().datatableRowLabel}` }))}
                                />
                                <div class="h-8 px-2 text-sm font-medium flex-center">
                                    {formatNumber(totalCount())} {baseConfig().datatableResultLabel}
                                </div>
                                <Pagination
                                    class="ml-auto"
                                    page={page()}
                                    limit={limit()}
                                    totalCount={totalCount()}
                                    onPageClick={setPage}
                                    buttonProps={{ sm: true }}
                                />
                            </div>
                        </Show>
                    </Show>
                </Slideout.Body>
            </Slideout>
        </>
    );
}
