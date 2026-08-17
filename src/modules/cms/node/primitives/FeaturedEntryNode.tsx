// src/modules/cms/node/primitives/FeaturedEntryNode.tsx
import { createResource, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import { fetchRepeatEntries } from '../nodeDataBinding';
import { LineArrowButton } from './editorialShared/LineArrowButton';
import { PageService } from '@/shared/services/page/page.service';
import { resolveDetailHref } from '@/modules/cms/api/resolveDetailHref';
import type { FeaturedEntrySlotsCfg } from '../node.types';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface FeaturedEntryNodeContent {
    eyebrow?: string;
}

/** Node primitive tương đương `FeaturedEntrySection.tsx` — teases 1 entry. Canvas Editor v2,
 * Task 14: migrated off the legacy node.props.dataSource/fieldMapping (SectionDataSource shape)
 * onto node.repeat (cardinality:'one') + node.props.slots (FeaturedEntrySlotsCfg), the SAME
 * mechanism every other repeat-consuming primitive in this codebase uses — see spec §1.4. */
export function FeaturedEntryNode(props: NodeComponentProps) {
    const slots = () => (props.node.props?.slots ?? {}) as FeaturedEntrySlotsCfg;
    const content = () => (props.node.props?.content ?? {}) as FeaturedEntryNodeContent;

    const [entriesResource] = createResource(
        () => ({ repeat: props.node.repeat, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => (args.repeat ? fetchRepeatEntries(args.repeat, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }) : Promise.resolve([])),
    );
    const entry = () => entriesResource()?.[0];

    const [detailPattern] = createResource(
        () => props.node.repeat?.contentTypeKey,
        (contentTypeId) => PageService.getPublicDetailPathByContentType({ contentTypeId, locale: props.context.locale }),
    );
    const href = () => resolveDetailHref(detailPattern() ?? undefined, entry()?.data as Record<string, unknown> | undefined);

    const fieldOf = (slotKey: keyof FeaturedEntrySlotsCfg) => {
        const key = slots()[slotKey];
        return key ? entry()?.data?.[key] : undefined;
    };

    return (
        <Show when={entry()}>
            <section class="bg-[#020202] py-20 text-[#f2f2f2]">
                <div class="mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-2">
                    <Show when={fieldOf('imageField')}>
                        <img use:animate={getLayerForNode(props.node, 'image')} src={fieldOf('imageField')} alt="" class="aspect-[4/3] w-full rounded-2xl object-cover" />
                    </Show>
                    <div use:animate={getLayerForNode(props.node, 'heading')} class="flex flex-col justify-center">
                        <p class="text-xs font-semibold uppercase tracking-wider text-[#ed6aa8]">
                            {content().eyebrow} {fieldOf('categoryField')}
                        </p>
                        <h2 class="mt-3 font-light" style={{ 'font-size': 'clamp(30px, 3vw, 48px)' }}>{fieldOf('headingField')}</h2>
                        <p use:animate={getLayerForNode(props.node, 'excerpt')} class="mt-4 max-w-xl leading-relaxed text-[#b8b8b8]">{fieldOf('descriptionField')}</p>
                        <Show when={href()}>
                            <LineArrowButton href={href()} label="Đọc bài viết" />
                        </Show>
                    </div>
                </div>
            </section>
        </Show>
    );
}
