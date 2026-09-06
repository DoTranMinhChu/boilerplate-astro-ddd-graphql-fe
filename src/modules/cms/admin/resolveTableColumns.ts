// Fix round mục E — replaces manageContentEntries.page.tsx's old hard `.slice(0, 3)` on
// showInListing fields. Pure so it's independently testable, same convention as
// dataWorkspaceConfig.ts/resolveActiveViewModes.ts (pure-function-then-thin-render-glue).
import { EFieldType } from '@shared/generated/typed-graphql';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

/** 3-step resolution (fix round mục E, per user's explicit instruction: configured columns are
 * saved on the ContentType itself, not localStorage — see ListViewConfig.tableColumns):
 * 1. `tableColumns` non-empty -> those exact fields, in that order (a stale key pointing at a
 *    since-deleted field is silently skipped, same "tolerate a stale reference" convention
 *    assignDefaultGridPositions.ts already established for a deleted field's leftover grid
 *    placement).
 * 2. Else, every field with `showInListing: true` — ALL of them, never capped.
 * 3. Else (0 configured, 0 showInListing), a smart default: first TEXT, then first IMAGE, then
 *    first SELECT field (whichever exist) — better than an empty/meaningless table. */
export function resolveTableColumns(fields: FieldDefinitionDTO[], tableColumns: string[] | undefined): FieldDefinitionDTO[] {
    if (tableColumns?.length) {
        const resolved = tableColumns
            .map((key) => fields.find((f) => f?.key === key))
            .filter((f): f is FieldDefinitionDTO => !!f);
        if (resolved.length) return resolved;
    }
    const shown = fields.filter((f) => f?.showInListing);
    if (shown.length) return shown;

    const fallback: FieldDefinitionDTO[] = [];
    const textField = fields.find((f) => f?.type === EFieldType.TEXT);
    if (textField) fallback.push(textField);
    const imageField = fields.find((f) => f?.type === EFieldType.IMAGE);
    if (imageField) fallback.push(imageField);
    const selectField = fields.find((f) => f?.type === EFieldType.SELECT);
    if (selectField) fallback.push(selectField);
    return fallback;
}
