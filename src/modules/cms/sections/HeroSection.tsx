import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

// use:animate cần import `animate` được reference tĩnh — giữ dòng dưới để Solid
// compiler không tree-shake mất directive.
const _ = animate;

export interface HeroContent {
    eyebrow?: string;
    heading?: string;
    description?: string;
    image?: string;
    ctaLabel?: string;
    ctaHref?: string;
    theme?: 'light' | 'dark';
}

export function HeroSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as HeroContent;
    const theme = () => resolveTheme(props.section, content().theme);
    const dark = () => theme() !== 'light';

    return (
        <section
            class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`}
            style={sectionCssVars(props.section)}
        >
            <div class="mx-auto max-w-5xl text-center">
                <Show when={content().eyebrow}>
                    <p
                        use:animate={getLayer(props.section, 'eyebrow')}
                        class="mb-3 text-sm font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--section-accent, #3b82f6)' }}
                    >
                        {content().eyebrow}
                    </p>
                </Show>
                <h1 use:animate={getLayer(props.section, 'heading')} class="text-4xl md:text-6xl font-bold tracking-tight">
                    {content().heading}
                </h1>
                <Show when={content().description}>
                    <p use:animate={getLayer(props.section, 'description')} class={`mx-auto mt-5 max-w-2xl text-lg ${dark() ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {content().description}
                    </p>
                </Show>
                <Show when={content().ctaLabel && content().ctaHref}>
                    <a
                        use:animate={getLayer(props.section, 'cta')}
                        href={content().ctaHref}
                        class="mt-8 inline-flex items-center rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-90"
                        style={{ 'background-color': 'var(--section-accent, #2563eb)' }}
                    >
                        {content().ctaLabel}
                    </a>
                </Show>
                <Show when={content().image}>
                    <img
                        use:animate={getLayer(props.section, 'image')}
                        src={content().image}
                        alt={content().heading || ''}
                        class="mx-auto mt-12 w-full max-w-4xl rounded-2xl object-cover shadow-xl"
                    />
                </Show>
            </div>
        </section>
    );
}
