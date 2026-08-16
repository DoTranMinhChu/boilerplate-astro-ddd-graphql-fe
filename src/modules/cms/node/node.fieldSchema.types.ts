// src/modules/cms/node/node.fieldSchema.types.ts
//
// Phase 2 (Widget Registry v2) — field-schema types consumed by NodeContentTab.tsx's
// generic FieldRenderer. A FieldDescriptor is a declarative description of ONE control
// in a node type's Content tab; NodeTypeDescriptor.fieldSchema is an ordered array of
// these, replacing the old hand-written `<Show when={type === X}>` chain.

/** Which control component FieldRenderer mounts for this field. Maps 1:1 to an
 * existing `@core/components/control/*` component — see FieldRenderer.tsx (Task 2). */
export type FieldControl =
    | 'text'      // Input
    | 'textarea'  // Textarea
    | 'code'      // Textarea, monospace styling (Task 3)
    | 'image'     // InputImage
    | 'color'     // InputColor
    | 'select'    // Select
    | 'number'    // InputNumber
    | 'boolean';  // Checkbox

export interface FieldSelectOption {
    value: string;
    /** i18n key under the `cms.node.content.*` namespace (same convention every other
     * label in this file uses) — FieldRenderer resolves it via `tOrLiteral`. */
    labelKey: string;
}

export interface FieldDescriptor {
    /** Written/read at `node.props[key]`. */
    key: string;
    /** i18n key for the field's `<label>` text. */
    labelKey: string;
    control: FieldControl;
    defaultValue?: unknown;
    /** Required when control === 'select'. */
    options?: FieldSelectOption[];
    /** Required when control === 'code' — picks monospace styling only; no
     * syntax-highlighting engine is added in Phase 2 (see plan's Global Constraints). */
    codeLanguage?: 'html' | 'css' | 'javascript';
}
