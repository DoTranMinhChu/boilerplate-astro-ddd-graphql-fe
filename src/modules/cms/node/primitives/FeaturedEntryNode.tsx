// src/modules/cms/node/primitives/FeaturedEntryNode.tsx
import { createResource, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import type { SectionDataSource } from '@/modules/cms/cms.types';
import { fetchDataSourceEntries } from '../fetchDataSourceEntries';
import { LineArrowButton } from '../../sections/editorial/LineArrowButton';
import { PageService } from '@/shared/services/page/page.service';
import { resolveDetailHref } from '@/modules/cms/api/resolveDetailHref';
import '../../sections/editorialEffects.css';

const _ = animate;

export interface FeaturedEntryNodeContent {
    eyebrow?: string;
}

/** Node primitive tương đương `FeaturedEntrySection.tsx` — teases 1 entry (dataSource manual, 1
 * id). Section gốc nhận `detailPathPattern` đã SSR-resolve sẵn; Node tự gọi
 * `PageService.getPublicDetailPathByContentType` 1 lần rồi `resolveDetailHref` (TÁI DÙNG 2 hàm
 * này, không viết lại — spec §3). */
export function FeaturedEntryNode(props: NodeComponentProps) {
    const dataSource = () => props.node.props?.dataSource as SectionDataSource | undefined;
    const mapping = () => (props.node.props?.fieldMapping ?? {}) as Record<string, string>;
    const content = () => (props.node.props?.content ?? {}) as FeaturedEntryNodeContent;

    const [entriesResource] = createResource(
        () => ({ dataSource: dataSource(), locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => fetchDataSourceEntries(args.dataSource, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }),
    );
    const entry = () => entriesResource()?.[0];

    const [detailPattern] = createResource(
        () => dataSource()?.query?.contentTypeId,
        (contentTypeId) => PageService.getPublicDetailPathByContentType({ contentTypeId, locale: props.context.locale }),
    );
    const href = () => resolveDetailHref(detailPattern() ?? undefined, entry()?.data as Record<string, unknown> | undefined);

    const fieldOf = (slot: string) => {
        const key = mapping()[slot];
        return key ? entry()?.data?.[key] : undefined;
    };

    return (
        <Show when={entry()}>
            <section class="bg-[#020202] py-20 text-[#f2f2f2]">
                <div class="mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-2">
                    <Show when={fieldOf('image')}>
                        <img use:animate={getLayerForNode(props.node, 'image')} src={fieldOf('image')} alt="" class="aspect-[4/3] w-full rounded-2xl object-cover" />
                    </Show>
                    <div use:animate={getLayerForNode(props.node, 'heading')} class="flex flex-col justify-center">
                        <p class="text-xs font-semibold uppercase tracking-wide text-[#ed6aa8]">
                            {content().eyebrow} {fieldOf('category')}
                        </p>
                        <h2 class="mt-3 font-light" style={{ 'font-size': 'clamp(30px, 3vw, 48px)' }}>{fieldOf('heading')}</h2>
                        <p use:animate={getLayerForNode(props.node, 'excerpt')} class="mt-4 max-w-xl leading-relaxed text-[#b8b8b8]">{fieldOf('description')}</p>
                        <Show when={href()}>
                            <LineArrowButton href={href()} label="Đọc bài viết" />
                        </Show>
                    </div>
                </div>
            </section>
        </Show>
    );
}
