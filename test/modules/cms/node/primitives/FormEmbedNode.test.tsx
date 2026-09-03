// src/modules/cms/node/primitives/FormEmbedNode.test.tsx
// @vitest-environment jsdom
//
// Regression test cho bug "RangeError: Maximum call stack size exceeded" khi mở
// /admin/cms/node-builder của 1 trang có node `form-embed`.
//
// Nguyên nhân gốc: `renderControlledFieldControl(field, value, onChange)` nhận value là 1 GIÁ
// TRỊ THƯỜNG. Viết thẳng lời gọi đó vào JSX khiến Solid bọc nó trong 1 render-effect có TRACK
// signal `values` — nên mỗi lần `values` đổi là TOÀN BỘ control bị huỷ và DỰNG LẠI. Một control
// tự phát `onChange` lúc mount (thật: `InputDate` gọi `emitDate(null)` cho ô ngày để trống) sẽ
// ghi vào `values` → dựng lại chính nó → phát onChange tiếp → lặp vô hạn.
//
// Test này KHÔNG dùng control thật: `contentEntryFieldRenderer` được mock bằng 1 control tối
// giản có ĐÚNG hành vi gây lỗi (phát onChange 1 lần lúc mount) và tự đếm số lần được TẠO. Bug
// biểu hiện là số lần tạo tăng vô hạn (thực tế: tràn stack), fix đúng thì mỗi field chỉ được
// tạo 1 lần. Cách này giữ test nhanh + không kéo cả cây Editor/InputImage/map vào jsdom.
//
// Cùng khuôn mock/`beforeAll` + dynamic import với MixedFeedNode.test.tsx và các test primitive
// khác trong thư mục này.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { FormService } from '@/shared/services/form/form.service';
import { render, waitFor } from '@solidjs/testing-library';
import { onMount } from 'solid-js';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

/** Số lần mỗi field được DỰNG control (không phải số lần render lại nội dung control). */
const createCounts: Record<string, number> = {};
/** Field nào tự phát onChange lúc mount — mô phỏng InputDate cho ô ngày để trống. */
const EMITS_ON_MOUNT = 'ngayDat';

vi.mock('@/shared/services/form/form.service', () => ({
    FormService: {
        getOneForm: vi.fn(async () => ({
            id: 'form-1',
            submitLabel: 'Đặt bàn',
            successMessage: 'Đã nhận',
            visibilityRules: null,
            fields: [
                { key: 'hoTen', label: 'Họ và tên', type: 'TEXT', required: true },
                { key: 'ngayDat', label: 'Ngày đặt', type: 'DATE', required: true },
            ],
        })),
        createPublicFormSubmission: vi.fn(async () => ({ id: 'sub-1' })),
    },
}));

vi.mock('@/shared/components/fields/contentEntryFieldRenderer', () => ({
    renderControlledFieldControl: (field: FieldDefinitionDTO, value: any, onChange: (v: any) => void) => {
        const key = field.key ?? '';
        createCounts[key] = (createCounts[key] ?? 0) + 1;
        // Bảo hiểm: nếu bug quay lại, dừng ở 50 vòng thay vì để tràn stack — test vẫn fail
        // (assert `toBe(1)` bên dưới) nhưng với thông báo đọc được thay vì RangeError.
        if (createCounts[key] <= 50 && key === EMITS_ON_MOUNT) {
            onMount(() => onChange(null));
        }
        return <input data-testid={key} value={value ?? ''} readOnly />;
    },
}));

let FormEmbedNode: typeof import('@modules/cms/node/primitives/FormEmbedNode')['FormEmbedNode'];

beforeAll(async () => {
    ({ FormEmbedNode } = await import('@modules/cms/node/primitives/FormEmbedNode'));
}, 30000);

beforeEach(() => {
    for (const k of Object.keys(createCounts)) delete createCounts[k];
});

const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
const node = { id: 'n-form', type: 'form-embed', props: { formId: 'form-1' }, children: [] } as any;

describe('FormEmbedNode', () => {
    it('dựng mỗi control ĐÚNG 1 LẦN, kể cả khi 1 control tự phát onChange lúc mount', async () => {
        render(() => <FormEmbedNode node={node} context={context} />);

        await waitFor(() => expect(createCounts.hoTen).toBe(1));
        // Đây là assert chính: trước khi fix, ô DATE tự phát onChange(null) lúc mount làm
        // `values` đổi identity → render-effect bọc lời gọi renderControlledFieldControl chạy
        // lại → dựng control mới → phát onChange tiếp → lặp vô hạn (tràn stack ở trình duyệt).
        await waitFor(() => expect(createCounts.ngayDat).toBe(1));
    });

    it('không dựng lại control của field khác khi 1 field đổi giá trị', async () => {
        const { container } = render(() => <FormEmbedNode node={node} context={context} />);
        await waitFor(() => expect(container.querySelectorAll('input').length).toBe(2));

        const before = { ...createCounts };
        // Ô DATE đã tự phát onChange lúc mount ở trên; nếu `values` làm control bị dựng lại thì
        // count phải > 1. Giữ nguyên = control sống sót qua thay đổi giá trị (không mất focus/caret).
        expect(createCounts.hoTen).toBe(before.hoTen);
        expect(createCounts.ngayDat).toBe(1);
    });

    it('không gọi GetOneForm khi formId rỗng (Task 15 review — Section/Pattern Library seeds formId:"" cho tới khi admin dán id thật)', async () => {
        vi.mocked(FormService.getOneForm).mockClear();
        const emptyFormNode = { id: 'n-form-empty', type: 'form-embed', props: { formId: '' }, children: [] } as any;
        render(() => <FormEmbedNode node={emptyFormNode} context={context} />);

        // Không có field nào để chờ dựng (không có form) — chờ 1 tick để bất kỳ fetch nào (nếu
        // có) đã kịp bắn ra, rồi khẳng định KHÔNG CÓ.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(FormService.getOneForm).not.toHaveBeenCalled();
    });

    // Task 8 (audit Group 0.7): node được đăng ký `capabilities.style: true` (tab Style/Effects/
    // Shadow hiện ra và sửa được trong Inspector), nhưng root <div> chưa bao giờ gọi
    // `applyNodeStyle` — mọi background/border/padding/typography admin set trên node Form vẫn
    // được LƯU bình thường nhưng KHÔNG BAO GIỜ lên trang, không giống mọi primitive style:true
    // khác (ButtonNode, TextNode, ...). Test này assert style thật sự lên `style` attribute.
    it('áp dụng node.style vào root element (trước fix: bị bỏ qua hoàn toàn)', async () => {
        const styledNode = {
            id: 'n-form-styled',
            type: 'form-embed',
            props: { formId: 'form-1' },
            style: { background: { type: 'color', value: '#ff0000' } },
            children: [],
        } as any;

        const { container } = render(() => <FormEmbedNode node={styledNode} context={context} />);
        // Chờ resource async resolve — dấu hiệu chắc chắn nhất là nút submit đã render.
        await waitFor(() => expect(container.querySelector('button')).not.toBeNull());

        const root = container.querySelector('div');
        expect(root).not.toBeNull();
        // Trước fix: root không có attribute style nào cả, bất kể node.style là gì.
        expect(root!.getAttribute('style') ?? '').toContain('background-color');
    });
});
