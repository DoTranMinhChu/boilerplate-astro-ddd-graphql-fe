// src/modules/cms/admin/validateContentTypeJsonImport.ts
//
// Task 18 — client-side PRE-check for "Nhập từ JSON" (JSON import) creation kind. Mirrors
// the BE's `assertUniqueFieldKeys` (duplicate field keys + REPEATER-inside-REPEATER 1-level
// limit) so obviously-broken payloads get a fast, friendly error before the admin even opens
// the field builder — this is NOT a replacement for the BE's own validation on
// `createContentType` (assertUniqueFieldKeys there is the real, authoritative check; this
// file only improves the local feedback loop).
//
// I7 (final whole-branch review) — this file used to validate NEITHER `field.type` against the
// real `EFieldType` enum NOR `listViewConfig`/`formConfig`'s shape. A hand-edited/malformed import
// (typo'd field type, or e.g. `listViewConfig: { enabledModes: "table" }` — a string, not an
// array) sailed through here, got saved, and then crashed `resolveActiveViewModes.ts` the next
// time anyone opened that content type's Content Entry list (`.filter()` on a non-array — a
// string's own truthy `.length` slips past the `enabledModes?.length` guard there). The 2 new
// checks below catch both cases at import time instead. Mirrored server-side in
// `ddd-graphql-be`'s `ContentTypeService` (`assertValidFieldTypes`/`assertValidViewConfigs`).
import { t } from '@/shared/i18n/t';
import { EFieldType } from '@/shared/generated/typed-graphql';

const VALID_FIELD_TYPES: Set<string> = new Set(Object.values(EFieldType));
const VALID_VIEW_MODES = new Set(['table', 'card', 'list', 'grid', 'gallery', 'kanban']);
const VALID_FORM_MODES = new Set(['dialog', 'drawer', 'fullPage', 'visualGrid']);

interface ParsedField { key: string; type: string; itemFields?: ParsedField[]; [k: string]: any }
interface ParsedPayload { fields: ParsedField[]; listViewConfig?: any; formConfig?: any }

function assertUniqueFieldKeys(fields: ParsedField[], depth = 0): string | null {
    const seen = new Set<string>();
    for (const f of fields) {
        if (!f?.key) return t('cms.jsonImport.errorMissingKey');
        if (seen.has(f.key)) return t('cms.jsonImport.errorDuplicateKey', { key: f.key });
        seen.add(f.key);
        if (f.type === 'REPEATER' && f.itemFields?.length) {
            if (depth >= 1) return t('cms.jsonImport.errorNestedRepeater', { key: f.key });
            const nested = assertUniqueFieldKeys(f.itemFields, depth + 1);
            if (nested) return nested;
        }
    }
    return null;
}

/** I7 — `f.type` must be a real `EFieldType` value, checked recursively (REPEATER's `itemFields`
 * included) same as `assertUniqueFieldKeys` above. A typo'd/legacy type name would otherwise reach
 * every field-type-driven consumer (renderer, grid designer, quick filters, ...) unchecked. */
function assertValidFieldTypes(fields: ParsedField[]): string | null {
    for (const f of fields) {
        if (!VALID_FIELD_TYPES.has(f.type)) return t('cms.jsonImport.errorInvalidFieldType', { key: f.key ?? '?', type: String(f.type) });
        if (f.type === 'REPEATER' && f.itemFields?.length) {
            const nested = assertValidFieldTypes(f.itemFields);
            if (nested) return nested;
        }
    }
    return null;
}

/** I7 — light shape check, just enough to guarantee `resolveActiveViewModes.ts`/`getSearchable...`/
 * `FieldGridLayoutDesigner`'s own consumers never receive a non-array where they call `.filter`/
 * `.map`/`.find` on `enabledModes`/`gridLayout`. Not a full schema validator — an admin hand-editing
 * JSON only needs a fast, friendly rejection of the shapes that are known to crash something. */
function assertValidViewConfigs(listViewConfig: any, formConfig: any): string | null {
    if (listViewConfig !== undefined && listViewConfig !== null) {
        if (typeof listViewConfig !== 'object' || Array.isArray(listViewConfig)) return t('cms.jsonImport.errorInvalidListViewConfig');
        const { enabledModes, defaultMode } = listViewConfig;
        if (enabledModes !== undefined && (!Array.isArray(enabledModes) || enabledModes.some((m: any) => !VALID_VIEW_MODES.has(m)))) {
            return t('cms.jsonImport.errorInvalidListViewConfig');
        }
        if (defaultMode !== undefined && !VALID_VIEW_MODES.has(defaultMode)) return t('cms.jsonImport.errorInvalidListViewConfig');
    }
    if (formConfig !== undefined && formConfig !== null) {
        if (typeof formConfig !== 'object' || Array.isArray(formConfig)) return t('cms.jsonImport.errorInvalidFormConfig');
        const { enabledModes, defaultMode, gridLayout } = formConfig;
        if (enabledModes !== undefined && (!Array.isArray(enabledModes) || enabledModes.some((m: any) => !VALID_FORM_MODES.has(m)))) {
            return t('cms.jsonImport.errorInvalidFormConfig');
        }
        if (defaultMode !== undefined && !VALID_FORM_MODES.has(defaultMode)) return t('cms.jsonImport.errorInvalidFormConfig');
        if (gridLayout !== undefined && !Array.isArray(gridLayout)) return t('cms.jsonImport.errorInvalidFormConfig');
    }
    return null;
}

export function validateContentTypeJsonImport(raw: string): { ok: true; data: ParsedPayload } | { ok: false; error: string } {
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ok: false, error: t('cms.jsonImport.errorInvalidJson') };
    }
    if (!parsed || !Array.isArray(parsed.fields) || !parsed.fields.length) {
        return { ok: false, error: t('cms.jsonImport.errorMissingFields') };
    }
    const keyError = assertUniqueFieldKeys(parsed.fields);
    if (keyError) return { ok: false, error: keyError };
    const typeError = assertValidFieldTypes(parsed.fields);
    if (typeError) return { ok: false, error: typeError };
    const configError = assertValidViewConfigs(parsed.listViewConfig, parsed.formConfig);
    if (configError) return { ok: false, error: configError };
    return { ok: true, data: { fields: parsed.fields, listViewConfig: parsed.listViewConfig, formConfig: parsed.formConfig } };
}
