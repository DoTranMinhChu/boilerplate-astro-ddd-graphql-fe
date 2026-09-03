// src/modules/cms/node/node.fieldSchema.types.ts
//
// Phase 2 (Widget Registry v2) — field-schema types consumed by NodeContentTab.tsx's
// generic FieldRenderer. A FieldDescriptor is a declarative description of ONE control
// in a node type's Content tab; NodeTypeDescriptor.fieldSchema is an ordered array of
// these, replacing the old hand-written `<Show when={type === X}>` chain.

/** Which control component FieldRenderer mounts for this field. Maps 1:1 to an
 * existing `@core/components/control/*` component — see FieldRenderer.tsx (Task 2).
 * Task 14 (enum/type-safety sweep): promoted from a bare string-literal union to an `as const`
 * object map — same convention as every other FE discriminant this plan touched (ENodeType,
 * EDataBindingMode, ...). */
export const EFieldControl = {
    TEXT: 'text',           // Input
    TEXTAREA: 'textarea',   // Textarea
    RICHTEXT: 'richtext',   // Editor (WYSIWYG) — for content rendered via DOMPurify.sanitize(innerHTML), e.g. legacy editorial nodes' lead/subtitle/body fields (Canvas Editor v2, Task 1)
    CODE: 'code',           // Textarea, monospace styling (Task 3)
    IMAGE: 'image',         // InputImage
    COLOR: 'color',         // InputColor
    SELECT: 'select',       // Select
    NUMBER: 'number',       // InputNumber
    BOOLEAN: 'boolean',     // Checkbox
    REPEATER: 'repeater',   // list-of-sub-objects editor — see RepeaterFieldEditor.tsx (Canvas Editor v2, Task 2)
} as const;
export type EFieldControl = (typeof EFieldControl)[keyof typeof EFieldControl];

export interface FieldSelectOption {
    value: string;
    /** i18n key under the `cms.node.content.*` namespace (same convention every other
     * label in this file uses) — FieldRenderer resolves it via `tOrLiteral`. */
    labelKey: string;
}

export interface FieldDescriptor {
    /** Written/read at `node.props[key]`, or a nested path (e.g. "content.heading") — see
     * getAtPath/setAtPath in NodeContentTab.tsx (Canvas Editor v2, Task 1). */
    key: string;
    /** i18n key for the field's `<label>` text. */
    labelKey: string;
    control: EFieldControl;
    defaultValue?: unknown;
    /** Required when control === 'select'. */
    options?: FieldSelectOption[];
    /** Required when control === 'code' — picks monospace styling only; no
     * syntax-highlighting engine is added in Phase 2 (see plan's Global Constraints). */
    codeLanguage?: 'html' | 'css' | 'javascript';
    /** Required when control === 'repeater'. 'object' = each row is a group of sub-fields
     * (itemFields required); 'string' = each row is one plain string value (itemFields ignored
     * — e.g. SpotlightListNode's content.items: string[]). Canvas Editor v2, Task 2. */
    repeaterItemShape?: 'object' | 'string';
    /** Required when repeaterItemShape === 'object' — one level only (no nested repeaters),
     * matching ContentType's own REPEATER field constraint (assertUniqueFieldKeys). */
    itemFields?: FieldDescriptor[];
    /** Label for the "add row" button, e.g. cms.node.content.addMetricButton. Defaults to a
     * generic "+ Thêm" if omitted. */
    addButtonLabelKey?: string;
}
