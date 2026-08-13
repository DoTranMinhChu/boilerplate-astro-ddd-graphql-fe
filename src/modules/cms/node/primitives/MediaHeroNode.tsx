// src/modules/cms/node/primitives/MediaHeroNode.tsx
import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import '../../sections/editorial/editorialEffects.css';

const _ = animate;

export interface MediaHeroNodeContent {
    image?: string;
    caption?: string;
    arrowHref?: string;
}

/** Node primitive tương đương `MediaHeroSection.tsx` — full-bleed image hero với hiệu ứng
 * "breathing" pan/zoom (`.ed-hero-image`, `editorialEffects.css`) + caption + mũi tên tròn. */
export function MediaHeroNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as MediaHeroNodeContent;

    return (
        <section class="relative overflow-hidden bg-[#020202]" style={{ 'min-height': '820px' }}>
            <div class="ed-hero-image absolute inset-0 bg-cover bg-center" style={{ 'background-image': content().image ? `url(${content().image})` : undefined }} role="img" aria-label={content().caption} />
            <div class="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 65%, #000 100%)' }} />
            <Show when={content().caption}>
                <div use:animate={getLayerForNode(props.node, 'caption')} class="absolute bottom-[52px] left-[5vw] flex items-center gap-6 text-xs uppercase tracking-wider text-white">
                    <p>{content().caption}</p>
                    <a class="ed-round-arrow" href={content().arrowHref || '#about'} aria-label="Khám phá">
                        <span>→</span>
                    </a>
                </div>
            </Show>
        </section>
    );
}
