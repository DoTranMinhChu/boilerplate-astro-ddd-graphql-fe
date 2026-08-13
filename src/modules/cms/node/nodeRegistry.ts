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
import { MediaHeroNode } from './primitives/MediaHeroNode';
import { IntroRailNode } from './primitives/IntroRailNode';
import { SpotlightListNode } from './primitives/SpotlightListNode';
import { StatMetricsNode } from './primitives/StatMetricsNode';
import { TimelineListNode } from './primitives/TimelineListNode';
import { ProcessStepsNode } from './primitives/ProcessStepsNode';
import { ContactColumnsNode } from './primitives/ContactColumnsNode';
import { AccordionListNode } from './primitives/AccordionListNode';
import { InquiryFormNode } from './primitives/InquiryFormNode';
import { ProjectShowcaseNode } from './primitives/ProjectShowcaseNode';
import { LogoGridNode } from './primitives/LogoGridNode';
import { FeaturedEntryNode } from './primitives/FeaturedEntryNode';
import { ContentDetailNode } from './primitives/ContentDetailNode';
import { MixedFeedNode } from './primitives/MixedFeedNode';

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
    [ENodeType.MEDIA_HERO]: MediaHeroNode,
    [ENodeType.INTRO_RAIL]: IntroRailNode,
    [ENodeType.SPOTLIGHT_LIST]: SpotlightListNode,
    [ENodeType.STAT_METRICS]: StatMetricsNode,
    [ENodeType.TIMELINE_LIST]: TimelineListNode,
    [ENodeType.PROCESS_STEPS]: ProcessStepsNode,
    [ENodeType.CONTACT_COLUMNS]: ContactColumnsNode,
    [ENodeType.ACCORDION_LIST]: AccordionListNode,
    [ENodeType.INQUIRY_FORM]: InquiryFormNode,
    [ENodeType.PROJECT_SHOWCASE]: ProjectShowcaseNode,
    [ENodeType.LOGO_GRID]: LogoGridNode,
    [ENodeType.FEATURED_ENTRY]: FeaturedEntryNode,
    [ENodeType.CONTENT_DETAIL]: ContentDetailNode,
    [ENodeType.MIXED_FEED]: MixedFeedNode,
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
    [ENodeType.MEDIA_HERO]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.INTRO_RAIL]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.SPOTLIGHT_LIST]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.STAT_METRICS]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.TIMELINE_LIST]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.PROCESS_STEPS]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.CONTACT_COLUMNS]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.ACCORDION_LIST]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.INQUIRY_FORM]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.PROJECT_SHOWCASE]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.LOGO_GRID]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.FEATURED_ENTRY]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.CONTENT_DETAIL]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
    [ENodeType.MIXED_FEED]: { style: false, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
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
    [ENodeType.MEDIA_HERO]: { icon: 'heroicons-solid:photo', labelKey: 'cms.node.types.mediaHero' },
    [ENodeType.INTRO_RAIL]: { icon: 'heroicons-solid:view-columns', labelKey: 'cms.node.types.introRail' },
    [ENodeType.SPOTLIGHT_LIST]: { icon: 'heroicons-solid:list-bullet', labelKey: 'cms.node.types.spotlightList' },
    [ENodeType.STAT_METRICS]: { icon: 'heroicons-solid:chart-bar', labelKey: 'cms.node.types.statMetrics' },
    [ENodeType.TIMELINE_LIST]: { icon: 'heroicons-solid:clock', labelKey: 'cms.node.types.timelineList' },
    [ENodeType.PROCESS_STEPS]: { icon: 'heroicons-solid:numbered-list', labelKey: 'cms.node.types.processSteps' },
    [ENodeType.CONTACT_COLUMNS]: { icon: 'heroicons-solid:envelope', labelKey: 'cms.node.types.contactColumns' },
    [ENodeType.ACCORDION_LIST]: { icon: 'heroicons-solid:chevron-up-down', labelKey: 'cms.node.types.accordionList' },
    [ENodeType.INQUIRY_FORM]: { icon: 'heroicons-solid:pencil-square', labelKey: 'cms.node.types.inquiryForm' },
    [ENodeType.PROJECT_SHOWCASE]: { icon: 'heroicons-solid:squares-plus', labelKey: 'cms.node.types.projectShowcase' },
    [ENodeType.LOGO_GRID]: { icon: 'heroicons-solid:squares-2x2', labelKey: 'cms.node.types.logoGrid' },
    [ENodeType.FEATURED_ENTRY]: { icon: 'heroicons-solid:star', labelKey: 'cms.node.types.featuredEntry' },
    [ENodeType.CONTENT_DETAIL]: { icon: 'heroicons-solid:document-text', labelKey: 'cms.node.types.contentDetail' },
    [ENodeType.MIXED_FEED]: { icon: 'heroicons-solid:rectangle-group', labelKey: 'cms.node.types.mixedFeed' },
};
