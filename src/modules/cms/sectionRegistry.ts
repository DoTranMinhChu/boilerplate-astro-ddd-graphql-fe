import type { Component } from 'solid-js';
import type { ContentEntryDTO, FieldDefinitionDTO, ResolvedSection } from '@/modules/cms/cms.types';
import { ESectionType } from '@/modules/cms/cms.constants';
import { HeroSection } from './sections/HeroSection';
import { TextImageSection } from './sections/TextImageSection';
import { CtaSection } from './sections/CtaSection';
import { ContentGridSection } from './sections/ContentGridSection';
import { ContentDetailSection } from './sections/ContentDetailSection';
import { MediaHeroSection } from './sections/editorial/MediaHeroSection';
import { IntroRailSection } from './sections/editorial/IntroRailSection';
import { ProjectShowcaseSection } from './sections/editorial/ProjectShowcaseSection';
import { SpotlightListSection } from './sections/editorial/SpotlightListSection';
import { LogoGridSection } from './sections/editorial/LogoGridSection';
import { StatMetricsSection } from './sections/editorial/StatMetricsSection';
import { TimelineListSection } from './sections/editorial/TimelineListSection';
import { AccordionListSection } from './sections/editorial/AccordionListSection';
import { ProcessStepsSection } from './sections/editorial/ProcessStepsSection';
import { ContactColumnsSection } from './sections/editorial/ContactColumnsSection';
import { InquiryFormSection } from './sections/editorial/InquiryFormSection';
import { FeaturedEntrySection } from './sections/editorial/FeaturedEntrySection';

export type SectionComponentProps = {
    section: ResolvedSection;
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
};

// Component-driven rendering (mục 24 spec CMS) — BE chỉ gửi `type`, FE tra
// registry này để chọn component. Type lạ (không có trong registry) được
// SectionRenderer bỏ qua an toàn, không crash trang.
export const sectionRegistry: Record<string, Component<SectionComponentProps>> = {
    [ESectionType.HERO]: HeroSection,
    [ESectionType.TEXT_IMAGE]: TextImageSection,
    [ESectionType.CTA]: CtaSection,
    [ESectionType.CONTENT_GRID]: ContentGridSection,
    [ESectionType.CONTENT_DETAIL]: ContentDetailSection,
    [ESectionType.MEDIA_HERO]: MediaHeroSection,
    [ESectionType.INTRO_RAIL]: IntroRailSection,
    [ESectionType.PROJECT_SHOWCASE]: ProjectShowcaseSection,
    [ESectionType.SPOTLIGHT_LIST]: SpotlightListSection,
    [ESectionType.LOGO_GRID]: LogoGridSection,
    [ESectionType.STAT_METRICS]: StatMetricsSection,
    [ESectionType.TIMELINE_LIST]: TimelineListSection,
    [ESectionType.ACCORDION_LIST]: AccordionListSection,
    [ESectionType.PROCESS_STEPS]: ProcessStepsSection,
    [ESectionType.CONTACT_COLUMNS]: ContactColumnsSection,
    [ESectionType.INQUIRY_FORM]: InquiryFormSection,
    [ESectionType.FEATURED_ENTRY]: FeaturedEntrySection,
};

export const SECTION_TYPE_OPTIONS = Object.keys(sectionRegistry).map((type) => ({ value: type, label: type }));

/** Icon + translated label + animatable targets for each registered section type —
 * single source of truth consumed by the Sections table, the Page Builder block list,
 * and the block palette (so adding a new section type only requires editing here). */
export const SECTION_TYPE_META: Record<string, { icon: string; labelKey: string; targets: string[] }> = {
    [ESectionType.HERO]: { icon: 'heroicons-solid:photo', labelKey: 'cms.builder.blockTypes.hero', targets: ['eyebrow', 'heading', 'description', 'image', 'cta'] },
    [ESectionType.TEXT_IMAGE]: { icon: 'heroicons-solid:view-columns', labelKey: 'cms.builder.blockTypes.textImage', targets: ['heading', 'text', 'image'] },
    [ESectionType.CTA]: { icon: 'heroicons-solid:megaphone', labelKey: 'cms.builder.blockTypes.cta', targets: ['heading', 'description', 'cta'] },
    [ESectionType.CONTENT_GRID]: { icon: 'heroicons-solid:squares-2x2', labelKey: 'cms.builder.blockTypes.contentGrid', targets: ['heading', 'grid'] },
    [ESectionType.CONTENT_DETAIL]: { icon: 'heroicons-solid:document-text', labelKey: 'cms.builder.blockTypes.contentDetail', targets: ['heading', 'image', 'body'] },
    [ESectionType.MEDIA_HERO]: { icon: 'heroicons-solid:film', labelKey: 'cms.builder.blockTypes.mediaHero', targets: ['caption'] },
    [ESectionType.INTRO_RAIL]: { icon: 'heroicons-solid:identification', labelKey: 'cms.builder.blockTypes.introRail', targets: ['rail', 'heading', 'lead', 'features'] },
    [ESectionType.PROJECT_SHOWCASE]: { icon: 'heroicons-solid:rectangle-stack', labelKey: 'cms.builder.blockTypes.projectShowcase', targets: ['heading', 'showcase'] },
    [ESectionType.SPOTLIGHT_LIST]: { icon: 'heroicons-solid:bars-3-bottom-left', labelKey: 'cms.builder.blockTypes.spotlightList', targets: ['rail', 'list'] },
    [ESectionType.LOGO_GRID]: { icon: 'heroicons-solid:squares-plus', labelKey: 'cms.builder.blockTypes.logoGrid', targets: ['rail', 'logos'] },
    [ESectionType.STAT_METRICS]: { icon: 'heroicons-solid:chart-bar', labelKey: 'cms.builder.blockTypes.statMetrics', targets: ['heading', 'metrics'] },
    [ESectionType.TIMELINE_LIST]: { icon: 'heroicons-solid:clock', labelKey: 'cms.builder.blockTypes.timelineList', targets: ['heading', 'timeline'] },
    [ESectionType.ACCORDION_LIST]: { icon: 'heroicons-solid:queue-list', labelKey: 'cms.builder.blockTypes.accordionList', targets: ['heading', 'items'] },
    [ESectionType.PROCESS_STEPS]: { icon: 'heroicons-solid:list-bullet', labelKey: 'cms.builder.blockTypes.processSteps', targets: ['heading', 'steps'] },
    [ESectionType.CONTACT_COLUMNS]: { icon: 'heroicons-solid:map-pin', labelKey: 'cms.builder.blockTypes.contactColumns', targets: ['heading', 'columns'] },
    [ESectionType.INQUIRY_FORM]: { icon: 'heroicons-solid:envelope', labelKey: 'cms.builder.blockTypes.inquiryForm', targets: ['heading', 'form'] },
    [ESectionType.FEATURED_ENTRY]: { icon: 'heroicons-solid:star', labelKey: 'cms.builder.blockTypes.featuredEntry', targets: ['image', 'heading', 'excerpt'] },
};
