// src/modules/cms/node/primitives/LogoGridNode.tsx
import { createResource, For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import type { SectionDataSource } from '@/modules/cms/cms.types';
import { fetchDataSourceEntries } from '../fetchDataSourceEntries';
import { OrbGlow } from './editorialShared/OrbGlow';
import './editorialShared/editorialEffects.css';
import DOMPurify from 'isomorphic-dompurify';

const _ = animate;

export interface LogoGridNodeContent {
    railTitle?: string;
    railText?: string;
}

/** Node primitive tương đương `LogoGridSection.tsx`. Nguồn logos qua
 * `props.node.props.dataSource`/`fieldMapping` (`name`, `logo`) — cùng mechanism CONTENT_GRID —
 * tự fetch qua `fetchDataSourceEntries` (Task 1); Astro-Solid's implicit `<Suspense>` +
 * `renderToStringAsync` đã resolve resource này ở SSR (kiểm chứng thật, Phase 0 M2c). */
export function LogoGridNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as LogoGridNodeContent;
    const mapping = () => (props.node.props?.fieldMapping ?? {}) as Record<string, string>;
    const dataSource = () => props.node.props?.dataSource as SectionDataSource | undefined;

    const [entriesResource] = createResource(
        () => ({ dataSource: dataSource(), locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => fetchDataSourceEntries(args.dataSource, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }),
    );

    const partners = () => (entriesResource() || []).map((entry) => {
        const data = entry.data || {};
        const nameKey = mapping().name;
        const logoKey = mapping().logo;
        return { name: nameKey ? data[nameKey] : undefined, logo: logoKey ? data[logoKey] : undefined };
    });

    return (
        <section class="relative overflow-hidden bg-[#020202] pb-[120px] text-[#f2f2f2]" style={{ 'min-height': '560px' }}>
            <OrbGlow color="gold" />
            <div class="relative z-[2] mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-[360px_minmax(0,1fr)]">
                <aside use:animate={getLayerForNode(props.node, 'rail')} class="pt-6">
                    <h2 class="m-0 text-xl leading-tight">{content().railTitle}</h2>
                    <div class="mt-2 max-w-[250px] text-sm leading-relaxed text-[#9b9b9b] [&_p]:m-0" innerHTML={DOMPurify.sanitize(content().railText || '')} />
                </aside>
                <div use:animate={getLayerForNode(props.node, 'logos')} class="ed-logo-grid">
                    <For each={partners()}>
                        {(p) => (
                            <Show when={p.logo} fallback={<span>{p.name}</span>}>
                                <img src={p.logo} alt={p.name || ''} class="mx-auto h-10 w-auto object-contain" />
                            </Show>
                        )}
                    </For>
                </div>
            </div>
        </section>
    );
}
