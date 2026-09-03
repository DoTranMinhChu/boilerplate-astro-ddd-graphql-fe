import { describe, it, expect } from 'vitest';
import { safeRedirect } from '@modules/customer/customerAuthHelpers';

// Regression test cho fix Critical (Task 13 review): `?redirect=` trước đây gán thẳng vào
// `window.location.href` không validate -- open redirect + `javascript:` URL sink (exfiltrate
// token_CUSTOMER vừa ghi vào localStorage). `safeRedirect` chỉ chấp nhận path nội bộ.
describe('safeRedirect', () => {
    it('chấp nhận path nội bộ hợp lệ', () => {
        expect(safeRedirect('/tai-khoan')).toBe('/tai-khoan');
        expect(safeRedirect('/lich-hen?tab=upcoming')).toBe('/lich-hen?tab=upcoming');
    });

    it('rơi về "/" khi null/rỗng', () => {
        expect(safeRedirect(null)).toBe('/');
        expect(safeRedirect('')).toBe('/');
    });

    it('chặn URL tuyệt đối ra ngoài site', () => {
        expect(safeRedirect('https://evil.com')).toBe('/');
        expect(safeRedirect('http://evil.com/phish')).toBe('/');
    });

    it('chặn protocol-relative URL ("//host" trông giống path nhưng browser hiểu là URL tuyệt đối)', () => {
        expect(safeRedirect('//evil.com')).toBe('/');
    });

    it('chặn javascript: URL sink (exfiltrate token qua script thực thi trong origin thật)', () => {
        expect(safeRedirect('javascript:alert(document.cookie)')).toBe('/');
    });

    it('chặn data: URL', () => {
        expect(safeRedirect('data:text/html,<script>alert(1)</script>')).toBe('/');
    });
});
