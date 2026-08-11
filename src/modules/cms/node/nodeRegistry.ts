// src/modules/cms/node/nodeRegistry.ts
import type { Component } from 'solid-js';
import { ENodeType } from './node.constants';
import type { NodeTree, NodeRenderContext } from './node.types';
import { FrameNode } from './primitives/FrameNode';
import { TextNode } from './primitives/TextNode';
import { ImageNode } from './primitives/ImageNode';
import { ShapeNode } from './primitives/ShapeNode';
import { VideoNode } from './primitives/VideoNode';
import { IconNode } from './primitives/IconNode';
import { ButtonNode } from './primitives/ButtonNode';
import { FormEmbedNode } from './primitives/FormEmbedNode';

export type NodeComponentProps = {
    node: NodeTree;
    context: NodeRenderContext;
};

export interface NodeCapabilities {
    style: boolean;
    animation: boolean;
    dataBinding: boolean;
    repeat: boolean;
    layoutChildren: boolean;
}

/** Component-driven rendering, cùng nguyên lý với sectionRegistry.ts nhưng dùng
 * được ở BẤT KỲ độ sâu nào của cây (không chỉ top-level). Type lạ được
 * NodeRenderer bỏ qua an toàn (xem Task 20), không crash cây. */
export const nodeRegistry: Record<string, Component<NodeComponentProps>> = {
    [ENodeType.FRAME]: FrameNode,
    [ENodeType.TEXT]: TextNode,
    [ENodeType.IMAGE]: ImageNode,
    [ENodeType.SHAPE]: ShapeNode,
    [ENodeType.VIDEO]: VideoNode,
    [ENodeType.ICON]: IconNode,
    [ENodeType.BUTTON]: ButtonNode,
    [ENodeType.FORM_EMBED]: FormEmbedNode,
};

/** Điều khiển Inspector hiện tab nào cho từng type — cùng cơ chế cho primitive
 * VÀ dev-widget (khi Phase 6 thêm widget, chỉ cần thêm 1 entry ở đây). */
export const nodeCapabilities: Record<string, NodeCapabilities> = {
    [ENodeType.FRAME]: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: true },
    [ENodeType.TEXT]: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
    [ENodeType.IMAGE]: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
    [ENodeType.SHAPE]: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.VIDEO]: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
    [ENodeType.ICON]: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.BUTTON]: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
    [ENodeType.FORM_EMBED]: { style: true, animation: false, dataBinding: false, repeat: false, layoutChildren: false },
};

export const NODE_TYPE_META: Record<string, { icon: string; labelKey: string }> = {
    [ENodeType.FRAME]: { icon: 'heroicons-solid:squares-2x2', labelKey: 'cms.node.types.frame' },
    [ENodeType.TEXT]: { icon: 'heroicons-solid:bars-3-bottom-left', labelKey: 'cms.node.types.text' },
    [ENodeType.IMAGE]: { icon: 'heroicons-solid:photo', labelKey: 'cms.node.types.image' },
    [ENodeType.SHAPE]: { icon: 'heroicons-solid:square-2-stack', labelKey: 'cms.node.types.shape' },
    [ENodeType.VIDEO]: { icon: 'heroicons-solid:film', labelKey: 'cms.node.types.video' },
    [ENodeType.ICON]: { icon: 'heroicons-solid:star', labelKey: 'cms.node.types.icon' },
    [ENodeType.BUTTON]: { icon: 'heroicons-solid:cursor-arrow-rays', labelKey: 'cms.node.types.button' },
    [ENodeType.FORM_EMBED]: { icon: 'heroicons-solid:clipboard-document-list', labelKey: 'cms.node.types.formEmbed' },
};
