// src/shared/services/form/form.service.ts — Task 16 (FE, item 3.15-FE)
//
// `getAllFormSubmission` chuyển từ mảng thẳng (BE trả unbounded) sang edges/pageInfo, khớp
// `PaginatedFormSubmission` mới của BE Task 9. `formId` LUÔN là arg riêng, server-enforced --
// test khoá lại rằng FE không tự gộp `formId` vào `input.filter` phía client (BE tự merge
// server-side; gộp thêm ở FE là dư thừa/sai nếu `input.filter` vốn có giá trị khác).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormService } from '@shared/services/form/form.service';

describe('FormService.getAllFormSubmission', () => {
    beforeEach(() => {
        vi.spyOn(FormService as any, 'queryApi').mockResolvedValue({
            getAllFormSubmission: {
                edges: [
                    { node: { id: 's1', formId: 'f1', data: { name: 'A' }, createdAt: '2026-01-01' }, cursor: 's1' },
                ],
                pageInfo: {
                    startCursor: 's1',
                    endCursor: 's1',
                    hasNextPage: false,
                    hasPreviousPage: false,
                    totalCount: 1,
                    totalPage: 1,
                    limit: 10,
                },
            },
        });
    });

    it('sends formId as its own scalar variable, never folded into input.filter', async () => {
        await FormService.getAllFormSubmission({ formId: 'f1', input: { page: 2, limit: 25 } });

        const call = (FormService as any).queryApi.mock.calls[0][0];
        expect(call.variables).toEqual({ formId: 'f1', input: { page: 2, limit: 25 } });
        expect(call.variables.input.filter).toBeUndefined();
    });

    it('passes input.filter through untouched (a real JS object, not pre-serialized)', async () => {
        await FormService.getAllFormSubmission({ formId: 'f1', input: { filter: { status: { $eq: 'read' } } } });

        const call = (FormService as any).queryApi.mock.calls[0][0];
        expect(call.variables.input.filter).toEqual({ status: { $eq: 'read' } });
        expect(typeof call.variables.input.filter).toBe('object');
    });

    it('returns the edges/pageInfo cursor shape (not a flat array)', async () => {
        const result = await FormService.getAllFormSubmission({ formId: 'f1', input: {} });

        expect(Array.isArray(result)).toBe(false);
        expect(result.edges).toHaveLength(1);
        expect(result.edges[0].node).toEqual({ id: 's1', formId: 'f1', data: { name: 'A' }, createdAt: '2026-01-01' });
        expect(result.pageInfo.totalCount).toBe(1);
        expect(result.pageInfo.hasNextPage).toBe(false);
    });
});
