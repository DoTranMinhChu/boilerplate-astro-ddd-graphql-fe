import { For, Show, Switch, Match } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import { ECustomElementType } from '@/modules/cms/cms.constants';
import type { CustomBlockElement, ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

const ALIGN_CLASS: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };
const IMAGE_ALIGN_CLASS: Record<string, string> = { left: '', center: 'mx-auto', right: 'ml-auto' };
const HEADING_SIZE_CLASS: Record<string, string> = { h2: 'text-3xl md:text-4xl', h3: 'text-2xl md:text-3xl', h4: 'text-xl md:text-2xl' };
const SPACER_HEIGHT: Record<string, string> = { sm: '1rem', md: '2rem', lg: '4rem', xl: '6rem' };

/**
 * Khối "Tự tạo" kiểu Notion — ghép nhiều phần tử tự do (tiêu đề/chữ/ảnh/nút/khoảng
 * trắng/gạch ngang) thành 1 bố cục riêng, thay vì bị bó buộc vào 1 khối định sẵn.
 * Mỗi phần tử tự chọn hiệu ứng riêng qua `getLayer(section, element.id)`.
 */
export function CustomBlockSection(props: { section: ResolvedSection }) {
    const elements = () => ((props.section.content as { elements?: CustomBlockElement[] } | undefined)?.elements) || [];
    const theme = () => resolveTheme(props.section);

    return (
        <Show when={elements().length}>
            <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
                <div class="mx-auto max-w-3xl space-y-5">
                    <For each={elements()}>
                        {(el) => (
                            <Switch>
                                <Match when={el.type === ECustomElementType.HEADING}>
                                    <Dynamic
                                        component={el.level || 'h2'}
                                        use:animate={getLayer(props.section, el.id)}
                                        class={`font-bold tracking-tight ${HEADING_SIZE_CLASS[el.level || 'h2']} ${ALIGN_CLASS[el.align || 'left']}`}
                                    >
                                        {el.text}
                                    </Dynamic>
                                </Match>
                                <Match when={el.type === ECustomElementType.TEXT}>
                                    <p use:animate={getLayer(props.section, el.id)} class={`leading-relaxed opacity-90 ${ALIGN_CLASS[el.align || 'left']}`}>
                                        {el.text}
                                    </p>
                                </Match>
                                <Match when={el.type === ECustomElementType.IMAGE}>
                                    <img
                                        use:animate={getLayer(props.section, el.id)}
                                        src={el.image}
                                        alt=""
                                        class={`block max-w-full rounded-2xl object-cover shadow-sm ${IMAGE_ALIGN_CLASS[el.align || 'left']}`}
                                    />
                                </Match>
                                <Match when={el.type === ECustomElementType.BUTTON}>
                                    <div class={ALIGN_CLASS[el.align || 'left']}>
                                        <a
                                            use:animate={getLayer(props.section, el.id)}
                                            href={el.href || '#'}
                                            class="inline-block rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700"
                                        >
                                            {el.text}
                                        </a>
                                    </div>
                                </Match>
                                <Match when={el.type === ECustomElementType.SPACER}>
                                    <div style={{ height: SPACER_HEIGHT[el.spacing || 'md'] }} />
                                </Match>
                                <Match when={el.type === ECustomElementType.DIVIDER}>
                                    <hr class="border-neutral-200" />
                                </Match>
                            </Switch>
                        )}
                    </For>
                </div>
            </section>
        </Show>
    );
}
