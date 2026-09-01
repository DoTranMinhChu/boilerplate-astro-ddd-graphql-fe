import { describe, it, expect } from 'vitest';
import { SAVABLE_NODE_FIELD_KEYS, pickSavableNodeFields } from './node.types';
import type { NodeDTO } from './node.types';

describe('NodeDTO.advanced', () => {
    it('is included in SAVABLE_NODE_FIELD_KEYS', () => {
        expect(SAVABLE_NODE_FIELD_KEYS).toContain('advanced');
    });

    it('round-trips through pickSavableNodeFields', () => {
        const node = {
            advanced: { htmlId: 'hero', cssClass: 'foo', ariaLabel: 'Hero section', ariaHidden: false, role: 'region', customCss: 'color: red;' },
        } as unknown as NodeDTO;
        const picked = pickSavableNodeFields(node);
        expect(picked.advanced).toEqual(node.advanced);
    });
});
