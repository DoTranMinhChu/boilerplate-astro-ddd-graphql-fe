import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import { LineArrowButton } from './LineArrowButton';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface FeaturedEntryContent {
    eyebrow?: string;
}

/** Teases ONE dynamically-sourced entry in a large editorial layout (image +
 * category/date + title + excerpt + "read more") — e.g. the single featured
 * article atop a Journal/News listing page. Reuses the same `dataSource`
 * (manual, single id) + `fieldMapping` mechanism as `content-grid`, so it works
 * with any admin-defined Object Type, not just one hardcoded to "article". */
export function FeaturedEntrySection(props: { section: ResolvedSection }) {
    const mapping = () => props.section.fieldMapping || {};
    const entry = () => props.section.entries?.[0];
    const fieldOf = (slot: string) => {
        const key = mapping()[slot];
        return key ? entry()?.data?.[key] : undefined;
    };
    const href = () => {
        const pattern = props.section.detailPathPattern;
        const slug = entry()?.slug;
        return pattern && slug ? pattern.replace(':slug', slug) : undefined;
    };

    return (
        <Show when={entry()}>
            <section class="bg-[#020202] py-20 text-[#f2f2f2]">
                <div class="mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-2">
                    <Show when={fieldOf('image')}>
                        <img use:animate={getLayer(props.section, 'image')} src={fieldOf('image')} alt="" class="aspect-[4/3] w-full rounded-2xl object-cover" />
                    </Show>
                    <div use:animate={getLayer(props.section, 'heading')} class="flex flex-col justify-center">
                        <p class="text-xs font-semibold uppercase tracking-wider text-[#ed6aa8]">
                            {(props.section.content as FeaturedEntryContent)?.eyebrow} {fieldOf('category')}
                        </p>
                        <h2 class="mt-3 font-light" style={{ 'font-size': 'clamp(30px, 3vw, 48px)' }}>{fieldOf('heading')}</h2>
                        <p use:animate={getLayer(props.section, 'excerpt')} class="mt-4 max-w-xl leading-relaxed text-[#b8b8b8]">{fieldOf('description')}</p>
                        <Show when={href()}>
                            <LineArrowButton href={href()} label="Đọc bài viết" />
                        </Show>
                    </div>
                </div>
            </section>
        </Show>
    );
}
