import { describe, expect, it } from 'vitest';
import { SCOPE_FIELD_REGISTRY, getScopeFieldConfig } from './scopeFieldRegistry';

describe('getScopeFieldConfig', () => {
    it('resolves the compound "resourceGroup:id" key when field is "id"', () => {
        const config = getScopeFieldConfig('id', 'unit');
        expect(config).toBe(SCOPE_FIELD_REGISTRY['unit:id']);
    });

    it('falls back to the plain field key when no compound match exists', () => {
        const config = getScopeFieldConfig('unitId', 'codeConfig');
        expect(config).toBe(SCOPE_FIELD_REGISTRY['unitId']);
    });

    it('prefers the compound key over the plain key when both exist', () => {
        const config = getScopeFieldConfig('id', 'codeConfig');
        expect(config).toBe(SCOPE_FIELD_REGISTRY['codeConfig:id']);
    });

    it('returns undefined for an unregistered field/resourceGroup pair', () => {
        expect(getScopeFieldConfig('unknown', 'xyz')).toBeUndefined();
    });

    it('returns undefined when field is empty/null/undefined', () => {
        expect(getScopeFieldConfig('')).toBeUndefined();
        expect(getScopeFieldConfig(null)).toBeUndefined();
        expect(getScopeFieldConfig(undefined)).toBeUndefined();
    });

    it('works without a resourceGroup by falling straight through to the plain key', () => {
        const config = getScopeFieldConfig('codeConfigId');
        expect(config).toBe(SCOPE_FIELD_REGISTRY['codeConfigId']);
    });
});
