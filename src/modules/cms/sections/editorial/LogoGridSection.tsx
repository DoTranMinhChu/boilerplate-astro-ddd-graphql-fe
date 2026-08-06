import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import { OrbGlow } from './OrbGlow';
import '../editorialEffects.css';

const _ = animate;

export interface LogoGridContent {
    railTitle?: string;
    railText?: string;
}

/** Sources logos from `dataSource`/`fieldMapping` (`name`, `logo`) — same
 * mechanism as `content-grid` — so it lists entries of an admin-defined Object
 * Type (e.g. "Partners"), not a hardcoded text list. Renders the logo image
 * when the mapped field has one, falling back to the plain name otherwise. */
export function LogoGridSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as LogoGridContent;
    const mapping = () => props.section.fieldMapping || {};
    const partners = () => (props.section.entries || []).map((entry) => {
        const data = entry.data || {};
        const nameKey = mapping().name;
        const logoKey = mapping().logo;
        return { name: nameKey ? data[nameKey] : undefined, logo: logoKey ? data[logoKey] : undefined };
    });

    return (
        <section class="relative overflow-hidden bg-[#020202] pb-[120px] text-[#f2f2f2]" style={{ 'min-height': '560px' }}>
            <OrbGlow color="gold" />
            <div class="relative z-[2] mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-[360px_minmax(0,1fr)]">
                <aside use:animate={getLayer(props.section, 'rail')} class="pt-6">
                    <h2 class="m-0 text-xl leading-tight">{content().railTitle}</h2>
                    <div class="mt-2 max-w-[250px] text-sm leading-relaxed text-[#9b9b9b] [&_p]:m-0" innerHTML={DOMPurify.sanitize(content().railText || '')} />
                </aside>
                <div use:animate={getLayer(props.section, 'logos')} class="ed-logo-grid">
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
