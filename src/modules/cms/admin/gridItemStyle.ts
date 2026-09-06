// Fix round — factored out of manageContentEntryEditor.page.tsx (was a private function there)
// because grid layout is now the default field arrangement for ALL 3 form modes (mục A), so
// manageContentEntries.page.tsx's Quick Dialog/Drawer body needs it too (Task 8), not just Full
// Page. `gridLayout` is expected to already be `assignDefaultGridPositions`'s OUTPUT (every real
// field guaranteed a placement) — the `undefined` fallback below is a defensive guard, not a
// code path any caller should expect to hit in practice.
import type { FieldDefinitionDTO, FieldGridLayoutItem } from '@/modules/cms/cms.types';

export function gridItemStyle(field: FieldDefinitionDTO, gridLayout: FieldGridLayoutItem[]) {
    const placement = gridLayout.find((g) => g.fieldKey === field.key);
    if (!placement) return undefined;
    return {
        'grid-column': `${placement.colStart} / span ${placement.colSpan}`,
        'grid-row': `${placement.rowStart + 1} / span ${placement.rowSpan}`,
        'align-self': placement.align ?? 'stretch',
        ...(placement.minHeight ? { 'min-height': `${placement.minHeight}px` } : {}),
    };
}
