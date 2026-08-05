import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface MediaHeroContent {
    image?: string;
    caption?: string;
    arrowHref?: string;
}

/** Full-bleed image hero with a slow "breathing" pan/zoom (reference `heroBreath`
 * keyframes) and a bottom caption + round arrow — visually distinct from the
 * generic `hero` section type, which centers text over the image instead. */
export function MediaHeroSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as MediaHeroContent;

    return (
        <section class="relative overflow-hidden bg-[#020202]" style={{ 'min-height': '820px' }}>
            <div class="ed-hero-image absolute inset-0 bg-cover bg-center" style={{ 'background-image': content().image ? `url(${content().image})` : undefined }} role="img" aria-label={content().caption} />
            <div class="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 65%, #000 100%)' }} />
            <Show when={content().caption}>
                <div use:animate={getLayer(props.section, 'caption')} class="absolute bottom-[52px] left-[5vw] flex items-center gap-6 text-xs uppercase tracking-wider text-white">
                    <p>{content().caption}</p>
                    <a class="ed-round-arrow" href={content().arrowHref || '#about'} aria-label="Khám phá">
                        <span>→</span>
                    </a>
                </div>
            </Show>
        </section>
    );
}
