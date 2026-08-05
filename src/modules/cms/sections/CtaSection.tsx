import { Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface CtaContent {
    heading?: string;
    description?: string;
    buttonLabel?: string;
    buttonHref?: string;
    email?: string;
    phone?: string;
}

export function CtaSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as CtaContent;
    // CTA đã luôn tối (bg-neutral-950) mặc định trước khi có style system — giữ mặc định
    // đó bằng cách coi "chưa chọn theme" là dark, chỉ đổi khi admin chọn theme khác.
    const theme = () => resolveTheme(props.section, 'dark');
    const light = () => theme() === 'light';

    return (
        <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
            <div class="mx-auto max-w-3xl text-center">
                <h2 use:animate={getLayer(props.section, 'heading')} class="text-3xl md:text-4xl font-bold">
                    {content().heading}
                </h2>
                <Show when={content().description}>
                    <p use:animate={getLayer(props.section, 'description')} class="mt-4 opacity-80">
                        {content().description}
                    </p>
                </Show>
                <div use:animate={getLayer(props.section, 'cta')} class="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <Show when={content().buttonLabel && content().buttonHref}>
                        <a
                            href={content().buttonHref}
                            class={`rounded-full px-6 py-3 font-semibold transition hover:opacity-90 ${light() ? 'text-white' : 'text-neutral-950'}`}
                            style={{ 'background-color': light() ? 'var(--section-accent, #2563eb)' : 'var(--section-text, #ffffff)' }}
                        >
                            {content().buttonLabel}
                        </a>
                    </Show>
                    <Show when={content().email}>
                        <a href={`mailto:${content().email}`} class="underline underline-offset-4 opacity-80">{content().email}</a>
                    </Show>
                    <Show when={content().phone}>
                        <a href={`tel:${content().phone}`} class="underline underline-offset-4 opacity-80">{content().phone}</a>
                    </Show>
                </div>
            </div>
        </section>
    );
}
