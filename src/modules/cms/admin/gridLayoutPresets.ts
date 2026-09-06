// Grid Layout Builder redesign — quick-start layout presets for `GridLayoutBuilder.tsx`'s
// "Lưới mẫu" dropdown. A preset is a relative shape (row-groups of {colStart, colSpan} cells);
// `presetToZones` expands it into absolute zones starting at a given row, which the caller
// appends to its canvas as unsaved, drag-target placeholders (see GridLayoutBuilder.tsx §5.5 of
// the design spec — a zone disappears the moment a field is dropped onto it, or the dialog is
// closed and reopened; it is never part of the persisted FieldGridLayoutItem[] itself).
export interface GridLayoutPresetCell {
    colStart: number;
    colSpan: number;
}

export interface GridLayoutPreset {
    key: string;
    /** i18n key under cms.contentTypeConfig.gridPresets.* */
    labelKey: string;
    /** Outer array = rows (top to bottom); inner array = the cells within that row. */
    rows: GridLayoutPresetCell[][];
}

export const GRID_LAYOUT_PRESETS: GridLayoutPreset[] = [
    { key: 'full', labelKey: 'cms.contentTypeConfig.gridPresets.full', rows: [[{ colStart: 1, colSpan: 12 }]] },
    {
        key: 'halfHalf',
        labelKey: 'cms.contentTypeConfig.gridPresets.halfHalf',
        rows: [[{ colStart: 1, colSpan: 6 }, { colStart: 7, colSpan: 6 }]],
    },
    {
        key: 'twoThirdOneThird',
        labelKey: 'cms.contentTypeConfig.gridPresets.twoThirdOneThird',
        rows: [[{ colStart: 1, colSpan: 8 }, { colStart: 9, colSpan: 4 }]],
    },
    {
        key: 'oneThirdTwoThird',
        labelKey: 'cms.contentTypeConfig.gridPresets.oneThirdTwoThird',
        rows: [[{ colStart: 1, colSpan: 4 }, { colStart: 5, colSpan: 8 }]],
    },
    {
        key: 'threeCols',
        labelKey: 'cms.contentTypeConfig.gridPresets.threeCols',
        rows: [[{ colStart: 1, colSpan: 4 }, { colStart: 5, colSpan: 4 }, { colStart: 9, colSpan: 4 }]],
    },
    {
        key: 'dashboard',
        labelKey: 'cms.contentTypeConfig.gridPresets.dashboard',
        rows: [
            [{ colStart: 1, colSpan: 12 }],
            [{ colStart: 1, colSpan: 4 }, { colStart: 5, colSpan: 4 }, { colStart: 9, colSpan: 4 }],
            [{ colStart: 1, colSpan: 12 }],
        ],
    },
];

export interface GridLayoutZone {
    colStart: number;
    colSpan: number;
    rowStart: number;
    rowSpan: number;
}

/** Expands a preset's relative row-groups into absolute zones starting at `startRow`. Every zone
 * gets `rowSpan: 1` (no preset needs a multi-row cell — `dashboard`'s 3 "rows" are 3 separate
 * 1-row-tall zone groups, not a single tall zone). */
export function presetToZones(preset: GridLayoutPreset, startRow: number): GridLayoutZone[] {
    const zones: GridLayoutZone[] = [];
    preset.rows.forEach((rowCells, i) => {
        rowCells.forEach((cell) => {
            zones.push({ ...cell, rowStart: startRow + i, rowSpan: 1 });
        });
    });
    return zones;
}
