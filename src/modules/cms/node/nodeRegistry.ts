// src/modules/cms/node/nodeRegistry.ts
import type { Component } from 'solid-js';
import { ENodeType } from './node.constants';
import type { NodeTree, NodeRenderContext } from './node.types';
import type { FieldDescriptor } from './node.fieldSchema.types';
import { FrameNode } from './primitives/FrameNode';
import { TextNode } from './primitives/TextNode';
import { ImageNode } from './primitives/ImageNode';
import { ShapeNode } from './primitives/ShapeNode';
import { VideoNode } from './primitives/VideoNode';
import { IconNode } from './primitives/IconNode';
import { ButtonNode } from './primitives/ButtonNode';
import { FormEmbedNode } from './primitives/FormEmbedNode';
import { CustomCodeNode } from './primitives/CustomCodeNode';
import { TableNode } from './primitives/TableNode';
import { CardListNode } from './primitives/CardListNode';
import { ChartNode } from './primitives/ChartNode';
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

/** Phase 2 (Widget Registry v2) — ONE descriptor per node type, replacing the 3
 * parallel maps this file used to export directly (`nodeRegistry`/`nodeCapabilities`/
 * `NODE_TYPE_META` are now derived below, keeping their exact old name/shape so no
 * other file needs to change). Adding a new node type now touches exactly ONE entry
 * here (plus its own primitive component file and i18n labels) instead of 3 separate
 * map edits + a NodeContentTab.tsx branch. */
export interface NodeTypeDescriptor {
    renderer: Component<NodeComponentProps>;
    icon: string;
    labelKey: string;
    capabilities: NodeCapabilities;
    /** Content tab field list — empty array for types with no Content tab (the 14
     * `MIGRATION_ONLY_NODE_TYPES`) or a container-only type like FRAME. */
    fieldSchema: FieldDescriptor[];
}

export const nodeTypeRegistry: Record<string, NodeTypeDescriptor> = {
    [ENodeType.FRAME]: {
        renderer: FrameNode,
        icon: 'heroicons-solid:squares-2x2',
        labelKey: 'cms.node.types.frame',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: true },
        fieldSchema: [],
    },
    [ENodeType.TEXT]: {
        renderer: TextNode,
        icon: 'heroicons-solid:bars-3-bottom-left',
        labelKey: 'cms.node.types.text',
        capabilities: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'textarea' },
            { key: 'richText', labelKey: 'cms.node.content.richTextLabel', control: 'boolean' },
            { key: 'countUp', labelKey: 'cms.node.content.countUpLabel', control: 'boolean' },
            { key: 'spotlightReveal', labelKey: 'cms.node.content.spotlightRevealLabel', control: 'boolean' },
        ],
    },
    [ENodeType.IMAGE]: {
        renderer: ImageNode,
        icon: 'heroicons-solid:photo',
        labelKey: 'cms.node.types.image',
        capabilities: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'src', labelKey: 'cms.node.content.imageLabel', control: 'image' },
            { key: 'alt', labelKey: 'cms.node.content.altLabel', control: 'text' },
        ],
    },
    [ENodeType.SHAPE]: {
        renderer: ShapeNode,
        icon: 'heroicons-solid:square-2-stack',
        labelKey: 'cms.node.types.shape',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            {
                key: 'shape',
                labelKey: 'cms.node.content.shapeLabel',
                control: 'select',
                defaultValue: 'rectangle',
                options: [
                    { value: 'rectangle', labelKey: 'cms.node.content.shapeRectangle' },
                    { value: 'ellipse', labelKey: 'cms.node.content.shapeEllipse' },
                ],
            },
        ],
    },
    [ENodeType.VIDEO]: {
        renderer: VideoNode,
        icon: 'heroicons-solid:film',
        labelKey: 'cms.node.types.video',
        capabilities: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'src', labelKey: 'cms.node.content.videoUrlLabel', control: 'text' },
        ],
    },
    [ENodeType.ICON]: {
        renderer: IconNode,
        icon: 'heroicons-solid:star',
        labelKey: 'cms.node.types.icon',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'icon', labelKey: 'cms.node.content.iconLabel', control: 'text' },
        ],
    },
    [ENodeType.BUTTON]: {
        renderer: ButtonNode,
        icon: 'heroicons-solid:cursor-arrow-rays',
        labelKey: 'cms.node.types.button',
        capabilities: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'label', labelKey: 'cms.node.content.buttonLabelLabel', control: 'text' },
            { key: 'href', labelKey: 'cms.node.content.buttonHrefLabel', control: 'text' },
        ],
    },
    [ENodeType.FORM_EMBED]: {
        renderer: FormEmbedNode,
        icon: 'heroicons-solid:clipboard-document-list',
        labelKey: 'cms.node.types.formEmbed',
        capabilities: { style: true, animation: false, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'formId', labelKey: 'cms.node.content.formIdLabel', control: 'text' },
        ],
    },
    [ENodeType.CUSTOM_CODE]: {
        renderer: CustomCodeNode,
        icon: 'heroicons-solid:code-bracket',
        labelKey: 'cms.node.types.customCode',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'html', labelKey: 'cms.node.content.customCodeHtmlLabel', control: 'code', codeLanguage: 'html', defaultValue: '' },
            { key: 'css', labelKey: 'cms.node.content.customCodeCssLabel', control: 'code', codeLanguage: 'css', defaultValue: '' },
            { key: 'js', labelKey: 'cms.node.content.customCodeJsLabel', control: 'code', codeLanguage: 'javascript', defaultValue: '' },
            {
                key: 'isolationMode',
                labelKey: 'cms.node.content.customCodeIsolationLabel',
                control: 'select',
                defaultValue: 'shadow',
                options: [
                    { value: 'direct', labelKey: 'cms.node.content.customCodeIsolationDirect' },
                    { value: 'shadow', labelKey: 'cms.node.content.customCodeIsolationShadow' },
                    { value: 'sandboxed', labelKey: 'cms.node.content.customCodeIsolationSandboxed' },
                ],
            },
        ],
    },
    // Node-level data binding (2026-08-17) — self-contained list primitives, `repeat: true`
    // (Data Source Inspector tab) but `layoutChildren: false` (they render their own rows/cards
    // internally, not a generic children-accepting container like FRAME). `fieldSchema: []` —
    // column/slot configuration lives in the Data Source tab (node.props.columns/.slots), not
    // the generic FieldRenderer-driven Content tab.
    [ENodeType.TABLE]: {
        renderer: TableNode,
        icon: 'heroicons-solid:table-cells',
        labelKey: 'cms.node.types.table',
        capabilities: { style: true, animation: false, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [],
    },
    [ENodeType.CARD_LIST]: {
        renderer: CardListNode,
        icon: 'heroicons-solid:squares-2x2',
        labelKey: 'cms.node.types.cardList',
        capabilities: { style: true, animation: false, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [],
    },
    // Task 9: hand-rolled SVG line/donut chart — same self-resolving-repeat shape as
    // TABLE/CARD_LIST above (own createResource + fetchRepeatEntries, ENodeType.CHART is in
    // SELF_RESOLVING_REPEAT_NODE_TYPES). Unlike TABLE/CARD_LIST, CHART DOES have a generic
    // Content-tab fieldSchema (variant/seriesMode/labelField/valueField/strokeColor/showLegend)
    // because its series can also be hand-entered statically (seriesMode:'static') via the
    // `staticSeries` repeater below.
    //
    // Final-review fix (Critical): `staticSeries` was originally a `code` control on the
    // premise that "v1 has no dedicated repeater UI for an array of {label,value} rows".
    // That premise was wrong — the generic 'repeater' FieldControl (RepeaterFieldEditor.tsx,
    // wired in FieldRenderer.tsx) is exactly that UI and predates this node type. The `code`
    // control is a plain textarea whose onChange writes the RAW STRING typed into it, with no
    // parse step anywhere, so the DEFAULT authoring path (seriesMode defaults to 'static')
    // persisted a string that ChartNode then consumed as an array — `points.map is not a
    // function`, swallowed by the per-node ErrorBoundary, chart never rendered. The repeater
    // below persists a real ChartPoint-shaped array and removes that parse-failure surface
    // entirely; resolveChartSeries.ts still normalizes the legacy JSON-string shape so Charts
    // authored against the old control keep working.
    // `capabilities.repeat: true` gates NodeDataSourceTab visibility in the Inspector — Chart
    // reuses the existing repeat/data-source UI to configure `node.repeat`, same as Table/CardList.
    [ENodeType.CHART]: {
        renderer: ChartNode,
        icon: 'heroicons-solid:chart-bar',
        labelKey: 'cms.node.types.chart',
        capabilities: { style: true, animation: false, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [
            {
                key: 'variant', labelKey: 'cms.node.content.chartVariant', control: 'select', defaultValue: 'line',
                options: [
                    { value: 'line', labelKey: 'cms.node.content.chartVariantLine' },
                    { value: 'donut', labelKey: 'cms.node.content.chartVariantDonut' },
                ],
            },
            {
                key: 'seriesMode', labelKey: 'cms.node.content.chartSeriesMode', control: 'select', defaultValue: 'static',
                options: [
                    { value: 'static', labelKey: 'cms.node.content.chartSeriesModeStatic' },
                    { value: 'repeat', labelKey: 'cms.node.content.chartSeriesModeRepeat' },
                ],
            },
            { key: 'labelField', labelKey: 'cms.node.content.chartLabelField', control: 'text' },
            { key: 'valueField', labelKey: 'cms.node.content.chartValueField', control: 'text' },
            { key: 'strokeColor', labelKey: 'cms.node.content.chartStrokeColor', control: 'color', defaultValue: '#6366f1' },
            { key: 'showLegend', labelKey: 'cms.node.content.chartShowLegend', control: 'boolean', defaultValue: true },
            {
                key: 'staticSeries', labelKey: 'cms.node.content.chartStaticSeries', control: 'repeater',
                repeaterItemShape: 'object',
                addButtonLabelKey: 'cms.node.content.chartAddPointButton',
                itemFields: [
                    { key: 'label', labelKey: 'cms.node.content.chartPointLabel', control: 'text' },
                    { key: 'value', labelKey: 'cms.node.content.chartPointValue', control: 'number' },
                ],
            },
        ],
    },
    [ENodeType.MEDIA_HERO]: {
        renderer: MediaHeroNode,
        icon: 'heroicons-solid:photo',
        labelKey: 'cms.node.types.mediaHero',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.image', labelKey: 'cms.node.content.mediaHeroImageLabel', control: 'image' },
            { key: 'content.caption', labelKey: 'cms.node.content.mediaHeroCaptionLabel', control: 'text' },
            { key: 'content.arrowHref', labelKey: 'cms.node.content.mediaHeroArrowHrefLabel', control: 'text' },
        ],
    },
    [ENodeType.INTRO_RAIL]: {
        renderer: IntroRailNode,
        icon: 'heroicons-solid:view-columns',
        labelKey: 'cms.node.types.introRail',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.railTitle', labelKey: 'cms.node.content.introRailRailTitleLabel', control: 'textarea' },
            { key: 'content.railArrowHref', labelKey: 'cms.node.content.introRailArrowHrefLabel', control: 'text' },
            { key: 'content.railServiceTitle', labelKey: 'cms.node.content.introRailServiceTitleLabel', control: 'text' },
            { key: 'content.railServiceText', labelKey: 'cms.node.content.introRailServiceTextLabel', control: 'textarea' },
            { key: 'content.heading', labelKey: 'cms.node.content.introRailHeadingLabel', control: 'textarea' },
            { key: 'content.lead', labelKey: 'cms.node.content.introRailLeadLabel', control: 'richtext' },
            {
                key: 'content.features', labelKey: 'cms.node.content.introRailFeaturesLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'image', labelKey: 'cms.node.content.introRailFeatureImageLabel', control: 'image' },
                    { key: 'text', labelKey: 'cms.node.content.introRailFeatureTextLabel', control: 'richtext' },
                ],
            },
            {
                key: 'content.featureColumns', labelKey: 'cms.node.content.introRailFeatureColumnsLabel', control: 'select', defaultValue: 3,
                options: [
                    { value: '1', labelKey: 'cms.node.content.gridCols1' },
                    { value: '2', labelKey: 'cms.node.content.gridCols2' },
                    { value: '3', labelKey: 'cms.node.content.gridCols3' },
                    { value: '4', labelKey: 'cms.node.content.gridCols4' },
                ],
            },
        ],
    },
    [ENodeType.SPOTLIGHT_LIST]: {
        renderer: SpotlightListNode,
        icon: 'heroicons-solid:list-bullet',
        labelKey: 'cms.node.types.spotlightList',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.railTitle', labelKey: 'cms.node.content.spotlightRailTitleLabel', control: 'text' },
            { key: 'content.railText', labelKey: 'cms.node.content.spotlightRailTextLabel', control: 'richtext' },
            { key: 'content.railArrowHref', labelKey: 'cms.node.content.spotlightArrowHrefLabel', control: 'text' },
            { key: 'content.items', labelKey: 'cms.node.content.spotlightItemsLabel', control: 'repeater', repeaterItemShape: 'string' },
        ],
    },
    [ENodeType.STAT_METRICS]: {
        renderer: StatMetricsNode,
        icon: 'heroicons-solid:chart-bar',
        labelKey: 'cms.node.types.statMetrics',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.statMetricsHeadingLabel', control: 'text' },
            {
                key: 'content.metrics', labelKey: 'cms.node.content.statMetricsListLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'value', labelKey: 'cms.node.content.metricValueLabel', control: 'number' },
                    { key: 'suffix', labelKey: 'cms.node.content.metricSuffixLabel', control: 'text' },
                    { key: 'label', labelKey: 'cms.node.content.metricLabelLabel', control: 'text' },
                ],
            },
        ],
    },
    [ENodeType.TIMELINE_LIST]: {
        renderer: TimelineListNode,
        icon: 'heroicons-solid:clock',
        labelKey: 'cms.node.types.timelineList',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.timelineHeadingLabel', control: 'text' },
            {
                key: 'content.timeline', labelKey: 'cms.node.content.timelineListLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'year', labelKey: 'cms.node.content.timelineYearLabel', control: 'text' },
                    { key: 'text', labelKey: 'cms.node.content.timelineTextLabel', control: 'textarea' },
                ],
            },
        ],
    },
    [ENodeType.PROCESS_STEPS]: {
        renderer: ProcessStepsNode,
        icon: 'heroicons-solid:numbered-list',
        labelKey: 'cms.node.types.processSteps',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.processStepsHeadingLabel', control: 'text' },
            {
                key: 'content.steps', labelKey: 'cms.node.content.processStepsListLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'title', labelKey: 'cms.node.content.stepTitleLabel', control: 'text' },
                    { key: 'text', labelKey: 'cms.node.content.stepTextLabel', control: 'textarea' },
                ],
            },
        ],
    },
    [ENodeType.CONTACT_COLUMNS]: {
        renderer: ContactColumnsNode,
        icon: 'heroicons-solid:envelope',
        labelKey: 'cms.node.types.contactColumns',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.contactHeadingLabel', control: 'text' },
            { key: 'content.hotlineLabel', labelKey: 'cms.node.content.contactHotlineLabelLabel', control: 'text' },
            { key: 'content.hotline', labelKey: 'cms.node.content.contactHotlineLabel', control: 'text' },
            { key: 'content.email', labelKey: 'cms.node.content.contactEmailLabel', control: 'text' },
            {
                key: 'content.columns', labelKey: 'cms.node.content.contactColumnsListLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'title', labelKey: 'cms.node.content.contactColumnTitleLabel', control: 'text' },
                    { key: 'text', labelKey: 'cms.node.content.contactColumnTextLabel', control: 'textarea' },
                ],
            },
        ],
    },
    [ENodeType.ACCORDION_LIST]: {
        renderer: AccordionListNode,
        icon: 'heroicons-solid:chevron-up-down',
        labelKey: 'cms.node.types.accordionList',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.accordionHeadingLabel', control: 'text' },
            {
                key: 'content.items', labelKey: 'cms.node.content.accordionItemsLabel', control: 'repeater',
                repeaterItemShape: 'object',
                itemFields: [
                    { key: 'title', labelKey: 'cms.node.content.accordionItemTitleLabel', control: 'text' },
                    { key: 'body', labelKey: 'cms.node.content.accordionItemBodyLabel', control: 'richtext' },
                ],
            },
        ],
    },
    [ENodeType.INQUIRY_FORM]: {
        renderer: InquiryFormNode,
        icon: 'heroicons-solid:pencil-square',
        labelKey: 'cms.node.types.inquiryForm',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.inquiryHeadingLabel', control: 'text' },
            { key: 'content.subtitle', labelKey: 'cms.node.content.inquirySubtitleLabel', control: 'richtext' },
            { key: 'content.serviceOptions', labelKey: 'cms.node.content.inquiryServiceOptionsLabel', control: 'repeater', repeaterItemShape: 'string' },
            { key: 'content.submitLabel', labelKey: 'cms.node.content.inquirySubmitLabelLabel', control: 'text' },
            { key: 'content.successMessage', labelKey: 'cms.node.content.inquirySuccessMessageLabel', control: 'text' },
        ],
    },
    [ENodeType.PROJECT_SHOWCASE]: {
        renderer: ProjectShowcaseNode,
        icon: 'heroicons-solid:squares-plus',
        labelKey: 'cms.node.types.projectShowcase',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.showcaseHeadingLabel', control: 'text' },
            { key: 'content.subtitle', labelKey: 'cms.node.content.showcaseSubtitleLabel', control: 'text' },
            { key: 'content.introArrowHref', labelKey: 'cms.node.content.showcaseArrowHrefLabel', control: 'text' },
            { key: 'content.autoplayMs', labelKey: 'cms.node.content.showcaseAutoplayMsLabel', control: 'number', defaultValue: 2300 },
        ],
    },
    [ENodeType.LOGO_GRID]: {
        renderer: LogoGridNode,
        icon: 'heroicons-solid:squares-2x2',
        labelKey: 'cms.node.types.logoGrid',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [
            { key: 'content.railTitle', labelKey: 'cms.node.content.logoGridRailTitleLabel', control: 'text' },
            { key: 'content.railText', labelKey: 'cms.node.content.logoGridRailTextLabel', control: 'richtext' },
        ],
    },
    [ENodeType.FEATURED_ENTRY]: {
        renderer: FeaturedEntryNode,
        icon: 'heroicons-solid:star',
        labelKey: 'cms.node.types.featuredEntry',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [
            { key: 'content.eyebrow', labelKey: 'cms.node.content.featuredEyebrowLabel', control: 'text' },
        ],
    },
    [ENodeType.CONTENT_DETAIL]: {
        renderer: ContentDetailNode,
        icon: 'heroicons-solid:document-text',
        labelKey: 'cms.node.types.contentDetail',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: false, layoutChildren: false },
        fieldSchema: [], // custom Content-tab branch (ContentDetailLayoutTab) — see NodeContentTab.tsx Task 12
    },
    [ENodeType.MIXED_FEED]: {
        renderer: MixedFeedNode,
        icon: 'heroicons-solid:rectangle-group',
        labelKey: 'cms.node.types.mixedFeed',
        capabilities: { style: true, animation: true, dataBinding: false, repeat: true, layoutChildren: false },
        fieldSchema: [
            { key: 'content.heading', labelKey: 'cms.node.content.mixedFeedHeadingLabel', control: 'text' },
            {
                key: 'layoutPreset', labelKey: 'cms.node.content.mixedFeedLayoutLabel', control: 'select', defaultValue: 'grid-3',
                options: [
                    { value: 'grid-2', labelKey: 'cms.node.content.mixedFeedGrid2' },
                    { value: 'grid-3', labelKey: 'cms.node.content.mixedFeedGrid3' },
                    { value: 'grid-4', labelKey: 'cms.node.content.mixedFeedGrid4' },
                ],
            },
        ],
    },
};

// --- Backward-compatible derived exports (same name/shape as before Phase 2) ---
// Every existing importer (NodePalette.tsx, NodeRenderer.tsx, NodeBuilder.page.tsx)
// keeps compiling and behaving identically — these are plain derivations, computed
// once at module load, not re-computed per access.

export const nodeRegistry: Record<string, Component<NodeComponentProps>> = Object.fromEntries(
    Object.entries(nodeTypeRegistry).map(([type, d]) => [type, d.renderer]),
);

export const nodeCapabilities: Record<string, NodeCapabilities> = Object.fromEntries(
    Object.entries(nodeTypeRegistry).map(([type, d]) => [type, d.capabilities]),
);

export const NODE_TYPE_META: Record<string, { icon: string; labelKey: string }> = Object.fromEntries(
    Object.entries(nodeTypeRegistry).map(([type, d]) => [type, { icon: d.icon, labelKey: d.labelKey }]),
);
