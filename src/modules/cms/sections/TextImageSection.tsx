import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface TextImageContent {
    heading?: string;
    text?: string;
    image?: string;
    imagePosition?: 'left' | 'right';
}

export function TextImageSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as TextImageContent;
    const imageLeft = () => content().imagePosition === 'left';
    const theme = () => resolveTheme(props.section);

    return (
        <section
            class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`}
            style={sectionCssVars(props.section)}
        >
            <div class={`mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2 ${imageLeft() ? '' : 'md:[&>*:first-child]:order-2'}`}>
                <Show when={content().image}>
                    <img
                        use:animate={getLayer(props.section, 'image')}
                        src={content().image}
                        alt={content().heading || ''}
                        class="w-full rounded-2xl object-cover shadow-lg"
                    />
                </Show>
                <div>
                    <h2 use:animate={getLayer(props.section, 'heading')} class="text-3xl font-bold tracking-tight">
                        {content().heading}
                    </h2>
                    <p use:animate={getLayer(props.section, 'text')} class="mt-4 whitespace-pre-line opacity-80">
                        {content().text}
                    </p>
                </div>
            </div>
        </section>
    );
}
