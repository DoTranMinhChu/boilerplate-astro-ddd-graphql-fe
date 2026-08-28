// src/modules/cms/admin/nodeBuilder/TypographyColorControl.tsx
import { Show } from 'solid-js';
import { Checkbox } from '@core/components/control/Checkbox';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { ColorControl } from '@core/components/control/ColorControl';
import type { StyleObject } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export type TypographyColor = NonNullable<NonNullable<StyleObject['typography']>['color']>;

export interface TypographyColorControlProps {
    value?: TypographyColor;
    onChange: (value: TypographyColor | undefined) => void;
    // Hover styling is CSS-only (compileNodeStateCss.ts's `compileNodeStateCss` delegates to
    // `applyNodeStyle`, which only ever produces inline-style-expressible CSS) — solid/image/
    // gradient all genuinely work there, but `video` mode requires a real <video> DOM element,
    // which TextNode.tsx's video branch only ever reads off the BASE `style().typography`, never
    // `style().hover?.typography`. Selecting "Video" in a hover context is therefore a silent
    // no-op with no way for the admin to know why — set this to hide that option at the one call
    // site (NodeStyleTab.tsx's Hover section) where it can never do anything.
    hideVideoOption?: boolean;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

const STARTER_VALUE: Record<TypographyColor['type'], string> = {
    solid: '#171717ff',
    image: '',
    gradient: 'linear-gradient(90deg, #000000, #ffffff)',
    video: '',
};

/** Type selector (Solid/Ảnh/Gradient/Video) + the matching sub-field, for the one style
 * property that can be filled with more than a flat color — text clipped to a photo/video/
 * gradient (see docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md
 * §3). `solid` reuses the existing RGBA `ColorControl`; `image`/`video`/`gradient` are plain
 * URL/CSS text fields — there's no swatch to pick for those. */
export function TypographyColorControl(props: TypographyColorControlProps) {
    return (
        <div class="flex flex-col gap-3">
            <Checkbox
                value={!!props.value}
                onChange={(on) => props.onChange(on ? { type: 'solid', value: STARTER_VALUE.solid } : undefined)}
                text={t('cms.node.style.textColorEnabled')}
                fieldless
            />
            <Show when={props.value}>
                {(value) => (
                    <>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.textColorType')}</label>
                            <Select
                                value={value().type}
                                onChange={(v) => {
                                    const type = v as TypographyColor['type'];
                                    props.onChange({ type, value: type === value().type ? value().value : STARTER_VALUE[type] });
                                }}
                                options={[
                                    { value: 'solid', label: t('cms.node.style.textColorTypeSolid') },
                                    { value: 'image', label: t('cms.node.style.textColorTypeImage') },
                                    { value: 'gradient', label: t('cms.node.style.textColorTypeGradient') },
                                    ...(props.hideVideoOption ? [] : [{ value: 'video', label: t('cms.node.style.textColorTypeVideo') }]),
                                ]}
                                fieldless
                            />
                        </div>
                        {/* Raw-literal color editors, no token-picker UI yet (Task 13's job) — every
                            `value().value` read below is cast `as string` since this control never
                            writes a `ThemeColorTokenRef` itself (every `onChange` here always passes a
                            plain string), so the value is always a plain string at runtime. */}
                        <Show when={value().type === 'solid'}>
                            <ColorControl
                                label={t('cms.node.style.textColor')}
                                value={value().value as string}
                                defaultValue="#171717ff"
                                onChange={(v) => props.onChange(v ? { type: 'solid', value: v } : undefined)}
                            />
                        </Show>
                        <Show when={value().type === 'image'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorImageUrl')}</label>
                                <Input value={value().value as string} onChange={(v) => props.onChange({ type: 'image', value: v ?? '' })} fieldless placeholder="https://..." />
                            </div>
                        </Show>
                        <Show when={value().type === 'video'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorVideoUrl')}</label>
                                <Input value={value().value as string} onChange={(v) => props.onChange({ type: 'video', value: v ?? '' })} fieldless placeholder="https://..." />
                            </div>
                        </Show>
                        <Show when={value().type === 'gradient'}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.textColorGradientValue')}</label>
                                <Input value={value().value as string} onChange={(v) => props.onChange({ type: 'gradient', value: v ?? '' })} fieldless placeholder="linear-gradient(...)" />
                            </div>
                        </Show>
                    </>
                )}
            </Show>
        </div>
    );
}
