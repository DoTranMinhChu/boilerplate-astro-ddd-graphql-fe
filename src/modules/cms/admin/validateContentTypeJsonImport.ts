// src/modules/cms/admin/validateContentTypeJsonImport.ts
//
// Task 18 — client-side PRE-check for "Nhập từ JSON" (JSON import) creation kind. Mirrors
// the BE's `assertUniqueFieldKeys` (duplicate field keys + REPEATER-inside-REPEATER 1-level
// limit) so obviously-broken payloads get a fast, friendly error before the admin even opens
// the field builder — this is NOT a replacement for the BE's own validation on
// `createContentType` (assertUniqueFieldKeys there is the real, authoritative check; this
// file only improves the local feedback loop).
import { t } from '@/shared/i18n/t';

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
    return { ok: true, data: { fields: parsed.fields, listViewConfig: parsed.listViewConfig, formConfig: parsed.formConfig } };
}
