// src/modules/cms/node/node.constants.ts
// Same `as const` pattern as ESectionType/ECustomElementType — plain objects, never a
// real TS enum, because values are serialized verbatim into the `type` jsonb column.

export const ENodeType = {
    FRAME: 'frame',
    TEXT: 'text',
    IMAGE: 'image',
    SHAPE: 'shape',
    VIDEO: 'video',
    ICON: 'icon',
    BUTTON: 'button',
    FORM_EMBED: 'form-embed',
} as const;
export type ENodeType = (typeof ENodeType)[keyof typeof ENodeType];

export const ELayoutMode = { FLOW: 'flow', FREE: 'free' } as const;
export type ELayoutMode = (typeof ELayoutMode)[keyof typeof ELayoutMode];

export const MAX_TREE_DEPTH = 30;
export const MAX_NODES_PER_PAGE = 500;
