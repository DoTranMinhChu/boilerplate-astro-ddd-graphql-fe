// src/modules/cms/admin/FormSubmissionsPanel.tsx — Task 16 (FE, item 3.15-FE)
// @vitest-environment jsdom
//
// `Dialog`/`Modal` (which `Slideout` wraps) portals through the app-wide `ModalProvider`
// singleton store into `#root > #modals` (`Dom.getRoot('modals')` throws "Root not found!"
// without a pre-existing `#root` element) — same setup reasoning as
// test/core/components/utilities/PreviewDrawer.test.tsx. Render `<ModalProvider>` alongside the
// panel and add `#root`, query via `screen`/`document.querySelectorAll` (bound to the whole
// `document.body`) since the portalled Slideout content never lands inside `render()`'s own
// container.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@solidjs/testing-library';
import { ModalProvider } from '@core/components/modal/ModalProvider';
import { FormSubmissionsPanel } from '@modules/cms/admin/FormSubmissionsPanel';
import type { FormDTO } from '@/shared/services/form/form.service';

const getAllFormSubmission = vi.fn();

vi.mock('@/shared/services/form/form.service', () => ({
    FormService: {
        getAllFormSubmission: (...args: any[]) => getAllFormSubmission(...args),
    },
}));

if (!('createObjectURL' in URL)) {
    (URL as any).createObjectURL = () => 'blob:test';
}
if (!('revokeObjectURL' in URL)) {
    (URL as any).revokeObjectURL = () => {};
}

const form: FormDTO = {
    id: 'form-1',
    key: 'lien-he',
    label: 'Liên hệ',
    fields: [
        { key: 'name', label: 'Họ tên' },
        { key: 'email', label: 'Email' },
    ],
} as any;

function makePage(nodes: any[], opts: { hasNextPage: boolean; totalCount: number; page: number; limit?: number }) {
    return {
        edges: nodes.map((n, i) => ({ node: n, cursor: `${opts.page}-${i}` })),
        pageInfo: {
            startCursor: null,
            endCursor: null,
            hasNextPage: opts.hasNextPage,
            hasPreviousPage: opts.page > 1,
            totalCount: opts.totalCount,
            totalPage: Math.ceil(opts.totalCount / (opts.limit ?? 10)),
            limit: opts.limit ?? 10,
        },
    };
}

describe('FormSubmissionsPanel', () => {
    let appRoot: HTMLDivElement;

    beforeEach(() => {
        appRoot = document.createElement('div');
        appRoot.id = 'root';
        document.body.appendChild(appRoot);
        getAllFormSubmission.mockReset();
    });

    afterEach(() => {
        // `Modal`'s real content portals into a separate `#root > #modals` tree appended
        // directly to `document.body` — `cleanup()` alone won't touch it, so `#root` (created
        // fresh per test above) is removed too, taking the whole portal tree with it.
        cleanup();
        appRoot.remove();
    });

    it('does not fetch submissions before the panel is opened (lazy fetch on open)', () => {
        const { container } = render(() => (
            <>
                <FormSubmissionsPanel form={form} />
                <ModalProvider />
            </>
        ));
        expect(container.querySelector('button')).toBeTruthy();
        expect(getAllFormSubmission).not.toHaveBeenCalled();
    });

    it('fetches page 1 with the default limit (10) on open and renders the returned rows', async () => {
        getAllFormSubmission.mockResolvedValue(
            makePage([{ id: 's1', formId: 'form-1', data: { name: 'A', email: 'a@x.com' }, createdAt: '2026-01-01' }], {
                hasNextPage: false,
                totalCount: 1,
                page: 1,
            }),
        );
        const { container } = render(() => (
            <>
                <FormSubmissionsPanel form={form} />
                <ModalProvider />
            </>
        ));
        fireEvent.click(container.querySelector('button')!);

        await waitFor(() =>
            expect(getAllFormSubmission).toHaveBeenCalledWith({ formId: 'form-1', input: { page: 1, limit: 10 } }),
        );
        expect(await screen.findByText('A')).toBeTruthy();
    });

    it('clicking page 2 re-fetches with page 2 and renders that page instead', async () => {
        getAllFormSubmission.mockImplementation(async ({ input }: any) => {
            if (input.page === 1) {
                return makePage(
                    Array.from({ length: 10 }, (_, i) => ({
                        id: `s${i}`,
                        formId: 'form-1',
                        data: { name: `N${i}` },
                        createdAt: '2026-01-01',
                    })),
                    { hasNextPage: true, totalCount: 12, page: 1 },
                );
            }
            return makePage(
                [{ id: 's10', formId: 'form-1', data: { name: 'Page2A' }, createdAt: '2026-01-02' }],
                { hasNextPage: false, totalCount: 12, page: 2 },
            );
        });
        render(() => (
            <>
                <FormSubmissionsPanel form={form} />
                <ModalProvider />
            </>
        ));
        fireEvent.click(document.querySelector('button')!);
        await screen.findByText('N0');
        expect(getAllFormSubmission).toHaveBeenCalledWith({ formId: 'form-1', input: { page: 1, limit: 10 } });

        fireEvent.click(screen.getByRole('button', { name: '2' }));

        await waitFor(() =>
            expect(getAllFormSubmission).toHaveBeenCalledWith({ formId: 'form-1', input: { page: 2, limit: 10 } }),
        );
        expect(await screen.findByText('Page2A')).toBeTruthy();
    });

    it('exports CSV by looping every page, not just the currently visible page', async () => {
        getAllFormSubmission.mockImplementation(async ({ input }: any) => {
            if (input.page === 1) {
                return makePage([{ id: 's1', formId: 'form-1', data: { name: 'Row1' }, createdAt: '2026-01-01' }], {
                    hasNextPage: true,
                    totalCount: 2,
                    page: 1,
                });
            }
            return makePage([{ id: 's2', formId: 'form-1', data: { name: 'Row2' }, createdAt: '2026-01-02' }], {
                hasNextPage: false,
                totalCount: 2,
                page: 2,
            });
        });

        let capturedBlob: Blob | undefined;
        vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: any) => {
            capturedBlob = blob;
            return 'blob:test';
        });
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        render(() => (
            <>
                <FormSubmissionsPanel form={form} />
                <ModalProvider />
            </>
        ));
        fireEvent.click(document.querySelector('button')!);
        await screen.findByText('Row1');

        fireEvent.click(screen.getByText('Xuất CSV'));

        await waitFor(() => expect(clickSpy).toHaveBeenCalled());

        // Trang hiển thị (limit 10) chỉ gọi 1 lần — export gọi THÊM 2 lần nữa (limit 200, page 1
        // rồi page 2, dừng đúng lúc `hasNextPage` false) để lấy hết toàn bộ 2 dòng thay vì chỉ
        // trang đang xem.
        const exportCalls = getAllFormSubmission.mock.calls.filter(([args]: any) => args.input.limit === 200);
        expect(exportCalls.map(([args]: any) => args.input.page)).toEqual([1, 2]);

        expect(capturedBlob).toBeTruthy();
        const text = await capturedBlob!.text();
        expect(text).toContain('Row1');
        expect(text).toContain('Row2');

        clickSpy.mockRestore();
    });

    it('disables the export button while nothing has loaded yet', () => {
        getAllFormSubmission.mockResolvedValue(makePage([], { hasNextPage: false, totalCount: 0, page: 1 }));
        render(() => (
            <>
                <FormSubmissionsPanel form={form} />
                <ModalProvider />
            </>
        ));
        fireEvent.click(document.querySelector('button')!);
        // `Button`/`CellButton` render "disabled" as CSS (`pointer-events-none`), not the native
        // HTML `disabled` attribute — assert on the class, not `.disabled`.
        const exportButton = screen.getByText('Xuất CSV').closest('button')!;
        expect(exportButton.className).toContain('pointer-events-none');
    });
});
