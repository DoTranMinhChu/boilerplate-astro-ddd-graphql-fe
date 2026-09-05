// @vitest-environment jsdom
//
// resolveGroupLabel is a pure function, but it lives inside ManageContentTypeGroupsDialog.tsx
// alongside Solid UI components (Button -> @solidjs/router's <A>) whose modules read
// `window`/call template() at import time (see vitest.config.ts's resolve.conditions:
// ['browser'] + vite-plugin-solid for why the .tsx import itself resolves to real browser
// code). jsdom supplies that `window`/`document` — scoped to just this file, mirroring
// ContentEntryRepeaterInput.test.ts's resolveContentEntryRepeaterItemTitle.

import { describe, it, expect } from 'vitest';
import { resolveGroupLabel } from '@/modules/cms/admin/ManageContentTypeGroupsDialog';

const GROUPS = [
    { id: 'g1', name: 'Sản phẩm' },
    { id: 'g2', name: 'Nội dung' },
] as any;

describe('resolveGroupLabel', () => {
    it('returns the matching group name', () => {
        expect(resolveGroupLabel(GROUPS, 'g2')).toBe('Nội dung');
    });

    it('returns "Khác" when groupId is undefined', () => {
        expect(resolveGroupLabel(GROUPS, undefined)).toBe('Khác');
    });

    it('returns "Khác" when groupId does not match any loaded group (stale/deleted group)', () => {
        expect(resolveGroupLabel(GROUPS, 'gone')).toBe('Khác');
    });
});
