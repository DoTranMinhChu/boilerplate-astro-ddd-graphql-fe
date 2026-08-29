// src/modules/cms/node/applyNodeStyle.test.ts
import { describe, it, expect } from 'vitest';
import { applyNodeStyle } from './applyNodeStyle';

describe('applyNodeStyle', () => {
    it('returns {} for an empty style object', () => {
        expect(applyNodeStyle({})).toEqual({});
    });

    it('maps spacing.padding/margin to CSS padding/margin shorthand', () => {
        const css = applyNodeStyle({ spacing: { padding: { t: 8, r: 16, b: 8, l: 16 }, margin: { t: 0, r: 0, b: 24, l: 0 }, gap: 12 } });
        expect(css.padding).toBe('8px 16px 8px 16px');
        expect(css.margin).toBe('0px 0px 24px 0px');
        expect(css.gap).toBe('12px');
    });

    // Post-final-review fix (N1): SpacingControl's "linked" clear (`setSide` writing
    // `{ t: undefined, r: undefined, b: undefined, l: undefined }`) leaves the `padding`/`margin`
    // OBJECT present with every side unset. Before this fix, the old `if (padding)`/`if (margin)`
    // truthy-object check fired anyway and emitted `'0px 0px 0px 0px'` — silently clobbering, on a
    // containerWidth-set FRAME, the token-derived `padding-block` that `applyContainerLayout`'s own
    // `hasExplicitPad` guard correctly still applies for this exact all-undefined-sides shape (see
    // applyNodeLayout.test.ts / FrameNode.test.tsx for the other half of this proof).
    it('emits no css.padding/margin when the padding/margin object exists but every side is undefined (SpacingControl "linked" clear)', () => {
        const css = applyNodeStyle({ spacing: { padding: { t: undefined, r: undefined, b: undefined, l: undefined }, margin: { t: undefined, r: undefined, b: undefined, l: undefined } } });
        expect(css.padding).toBeUndefined();
        expect(css.margin).toBeUndefined();
        expect('padding' in css).toBe(false);
        expect('margin' in css).toBe(false);
    });

    it('still emits css.padding when at least one side of the padding object holds an actual value', () => {
        const css = applyNodeStyle({ spacing: { padding: { t: 8, r: undefined, b: undefined, l: undefined } } });
        expect(css.padding).toBe('8px 0px 0px 0px');
    });

    it('maps size to width/height/min-width/max-width', () => {
        const css = applyNodeStyle({ size: { width: '100%', height: '400px', minW: '200px', maxW: '800px' } });
        expect(css.width).toBe('100%');
        expect(css.height).toBe('400px');
        expect(css['min-width']).toBe('200px');
        expect(css['max-width']).toBe('800px');
    });

    it('maps typography fields to their CSS equivalents', () => {
        const css = applyNodeStyle({ typography: { fontFamily: 'Inter', size: 18, weight: 600, lineHeight: 1.5, letterSpacing: 0.2, color: { type: 'solid', value: '#111' }, align: 'center', transform: 'uppercase', decoration: 'underline' } });
        expect(css['font-family']).toBe('Inter');
        expect(css['font-size']).toBe('18px');
        expect(css['font-weight']).toBe('600');
        expect(css['line-height']).toBe('1.5');
        expect(css['letter-spacing']).toBe('0.2px');
        expect(css.color).toBe('#111');
        expect(css['text-align']).toBe('center');
        expect(css['text-transform']).toBe('uppercase');
        expect(css['text-decoration']).toBe('underline');
    });

    it('normalizes a legacy plain-string typography.color (pre-union-type data) to solid mode instead of rendering no color at all', () => {
        // `as any` deliberately simulates data saved before typography.color became a union —
        // TypeScript would reject this today, but it's exactly what old DB rows/un-migrated
        // call sites still contain at runtime.
        const css = applyNodeStyle({ typography: { color: '#ffffff' as any } });
        expect(css.color).toBe('#ffffff');
    });

    it('maps a solid background color', () => {
        const css = applyNodeStyle({ background: { type: 'color', value: '#f5f5f5' } });
        expect(css['background-color']).toBe('#f5f5f5');
    });

    // Phase 3 bugfix — NodeStyleTab's "Loại nền"/"Kiểu viền" <Select>s DISPLAY 'color'/'solid'
    // as their defaults but only PERSIST them on an actual option change, so these two partial
    // shapes are what the overwhelmingly common "just pick a colour" edit really stores.
    it('treats a background with a value but no explicit type as a solid colour', () => {
        const css = applyNodeStyle({ background: { value: '#ff00ff' } });
        expect(css['background-color']).toBe('#ff00ff');
    });

    it('defaults an unspecified border style to solid', () => {
        const css = applyNodeStyle({ border: { width: 2, color: '#000' } });
        expect(css.border).toBe('2px solid #000');
    });

    it('still emits no border when width is unset (an unset width really is a 0-width border)', () => {
        expect(applyNodeStyle({ border: { color: '#000' } }).border).toBeUndefined();
    });

    it('maps border with per-corner radius', () => {
        const css = applyNodeStyle({ border: { width: 2, style: 'solid', color: '#000', radius: { tl: 4, tr: 4, br: 8, bl: 8 } } });
        expect(css.border).toBe('2px solid #000');
        expect(css['border-radius']).toBe('4px 4px 8px 8px');
    });

    it('maps multiple shadow layers to a comma-joined box-shadow', () => {
        const css = applyNodeStyle({ shadow: [{ x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.1)' }, { x: 0, y: 8, blur: 16, spread: 0, color: 'rgba(0,0,0,0.05)', inset: true }] });
        expect(css['box-shadow']).toBe('0px 2px 4px 0px rgba(0,0,0,0.1), inset 0px 8px 16px 0px rgba(0,0,0,0.05)');
    });

    it('maps effects and transform', () => {
        const css = applyNodeStyle({ effects: { opacity: 0.8, blur: 4, backdropBlur: 2, blendMode: 'multiply' }, transform: { rotate: 15, scaleX: 1.2, scaleY: 1 } });
        expect(css.opacity).toBe('0.8');
        expect(css.filter).toBe('blur(4px)');
        expect(css['backdrop-filter']).toBe('blur(2px)');
        expect(css['mix-blend-mode']).toBe('multiply');
        expect(css.transform).toBe('rotate(15deg) scaleX(1.2) scaleY(1)');
    });

    it('maps effects.grayscale into the filter list, combined with blur when both are set', () => {
        expect(applyNodeStyle({ effects: { grayscale: 100 } }).filter).toBe('grayscale(100%)');
        expect(applyNodeStyle({ effects: { blur: 4, grayscale: 60 } }).filter).toBe('blur(4px) grayscale(60%)');
    });

    it('maps transform.translateX/translateY to a CSS translate(), defaulting the unset axis to 0, ordered before rotate/scale', () => {
        expect(applyNodeStyle({ transform: { translateY: -6 } }).transform).toBe('translate(0px, -6px)');
        expect(applyNodeStyle({ transform: { translateX: 10, translateY: -6, rotate: 5 } }).transform).toBe('translate(10px, -6px) rotate(5deg)');
    });

    it('maps size.objectFit to CSS object-fit', () => {
        expect(applyNodeStyle({ size: { objectFit: 'cover' } })['object-fit']).toBe('cover');
    });

    it('maps typography.maxLines to a webkit line-clamp and forces overflow:hidden (required for the clamp to actually truncate)', () => {
        const css = applyNodeStyle({ typography: { maxLines: 3 } });
        expect(css.display).toBe('-webkit-box');
        expect(css['-webkit-line-clamp']).toBe('3');
        expect(css['-webkit-box-orient']).toBe('vertical');
        expect(css.overflow).toBe('hidden');
    });

    it('maps the general overflow field directly', () => {
        expect(applyNodeStyle({ overflow: 'auto' }).overflow).toBe('auto');
        expect(applyNodeStyle({ overflow: 'hidden' }).overflow).toBe('hidden');
    });

    it('typography.maxLines overrides a conflicting general overflow:auto (clamp must stay functional)', () => {
        const css = applyNodeStyle({ overflow: 'auto', typography: { maxLines: 2 } });
        expect(css.overflow).toBe('hidden');
    });

    it('applies no override when responsiveOverrides/breakpoint are omitted (2 legacy overloads stay identical)', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' } } };
        expect(applyNodeStyle(style)).toEqual(applyNodeStyle(style, undefined, 'desktop'));
    });

    it('merges only the tablet override at breakpoint "tablet"', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' }, size: 16 } };
        const overrides = { tablet: { style: { typography: { size: 20 } } }, mobile: { style: { typography: { size: 12 } } } };
        const css = applyNodeStyle(style, overrides, 'tablet');
        expect(css['font-size']).toBe('20px');
    });

    it('cascades tablet then mobile at breakpoint "mobile" (tablet applies first, mobile can override further)', () => {
        const style = { typography: { color: { type: 'solid' as const, value: '#111' }, size: 16 } };
        const overrides = { tablet: { style: { typography: { color: { type: 'solid' as const, value: '#222' } } } }, mobile: { style: { typography: { size: 12 } } } };
        const css = applyNodeStyle(style, overrides, 'mobile');
        expect(css['font-size']).toBe('12px');
        expect(css.color).toBe('#222'); // tablet's color override still applies at mobile — cascade, not override-only-own-bucket
    });

    // Regression test for the exact live repro on the shared demo page: a root FRAME with
    // `style: {}` and `responsiveOverrides.mobile.style = { background: { value: '#ff00ff' } }`
    // rendered NO background-color at all on the Node Builder canvas at the Mobile breakpoint.
    it('renders a per-breakpoint background-colour-only override on a node with no desktop background', () => {
        const overrides = { mobile: { style: { background: { value: '#ff00ff' } } } };
        expect(applyNodeStyle({}, overrides, 'mobile')['background-color']).toBe('#ff00ff');
        expect(applyNodeStyle({}, overrides, 'desktop')['background-color']).toBeUndefined();
    });

    // Phase 3 bugfix — a sparse override must INHERIT the sides it doesn't mention (that is
    // exactly what the Inspector's amber hint promises), not collapse them to 0 via
    // applyNodeStyle's `?? 0` fallbacks.
    it('inherits the padding sides a per-breakpoint override does not mention', () => {
        const style = { spacing: { padding: { t: 20, r: 20, b: 20, l: 20 } } };
        const overrides = { mobile: { style: { spacing: { padding: { t: 8 } } } } };
        expect(applyNodeStyle(style, overrides, 'mobile').padding).toBe('8px 20px 20px 20px');
    });

    it('renders typography.color image/gradient modes via background-clip:text', () => {
        const image = applyNodeStyle({ typography: { color: { type: 'image', value: 'https://example.com/photo.jpg' } } });
        expect(image['background-image']).toBe('url(https://example.com/photo.jpg)');
        expect(image['background-clip']).toBe('text');
        expect(image['-webkit-background-clip']).toBe('text');
        expect(image.color).toBe('transparent');

        const gradient = applyNodeStyle({ typography: { color: { type: 'gradient', value: 'linear-gradient(90deg, #f00, #00f)' } } });
        expect(gradient['background-image']).toBe('linear-gradient(90deg, #f00, #00f)');
        expect(gradient['background-clip']).toBe('text');
        expect(gradient.color).toBe('transparent');
    });

    it('emits no inline CSS for typography.color type "video" (TextNode.tsx handles it as a real <video> element instead)', () => {
        const css = applyNodeStyle({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } });
        expect(css.color).toBeUndefined();
        expect(css['background-image']).toBeUndefined();
    });

    // final-review fix (Important #2): TypographyColorControl's STARTER_VALUE seeds `image`/
    // `video` with an empty string the instant an admin picks that type from the dropdown —
    // before this fix, an empty-value image/gradient still emitted `background-image: url()` +
    // `background-clip: text` + `color: transparent`, making text vanish with zero explanation.
    it('emits no background-image/color CSS for typography.color type "image" with an empty value', () => {
        const css = applyNodeStyle({ typography: { color: { type: 'image', value: '' } } });
        expect(css['background-image']).toBeUndefined();
        expect(css['background-clip']).toBeUndefined();
        expect(css['-webkit-background-clip']).toBeUndefined();
        expect(css.color).toBeUndefined();
    });

    it('emits no background-image/color CSS for typography.color type "gradient" with an empty value', () => {
        const css = applyNodeStyle({ typography: { color: { type: 'gradient', value: '' } } });
        expect(css['background-image']).toBeUndefined();
        expect(css.color).toBeUndefined();
    });

    describe('theme token resolution', () => {
        it('resolves a typography.color tokenRef to a CSS var()', () => {
            const css = applyNodeStyle({ typography: { color: { type: 'solid', value: { tokenRef: 'primary' } } } });
            expect(css.color).toBe('var(--color-primary)');
        });

        it('still accepts a raw hex typography.color value unchanged', () => {
            const css = applyNodeStyle({ typography: { color: { type: 'solid', value: '#ff0000' } } });
            expect(css.color).toBe('#ff0000');
        });

        it('resolves a background color tokenRef to a CSS var()', () => {
            const css = applyNodeStyle({ background: { type: 'color', value: { tokenRef: 'surface' } as any } });
            expect(css['background-color']).toBe('var(--color-surface)');
        });

        it('resolves a background gradient tokenRef to a CSS var() instead of [object Object]', () => {
            const css = applyNodeStyle({ background: { type: 'gradient', value: { tokenRef: 'primary' } as any } });
            expect(css['background-image']).toBe('var(--color-primary)');
        });

        it('resolves a border color tokenRef to a CSS var()', () => {
            const css = applyNodeStyle({ border: { width: 1, color: { tokenRef: 'border' } as any } });
            expect(css.border).toBe('1px solid var(--color-border)');
        });

        it('applies typography.role\'s scale values when set and no explicit size/weight override it', () => {
            const css = applyNodeStyle({ typography: { role: 'h1' } });
            // final-review fix (Important #2 Part A): every var() now carries a defensive
            // fallback (a theme created via the Theme Manager UI never defines
            // `--type-h1-*`, which previously made this whole declaration set
            // invalid-at-computed-value-time and silently dropped).
            expect(css['font-size']).toBe('clamp(var(--type-h1-min, 32px), 5vw, var(--type-h1-max, 48px))');
            expect(css['font-weight']).toBe('var(--type-h1-weight, 700)');
            expect(css['line-height']).toBe('var(--type-h1-line-height, 1.15)');
            expect(css['letter-spacing']).toBe('var(--type-h1-letter-spacing, -0.01em)');
        });

        it('an explicit typography.size still wins over the role\'s scale size', () => {
            const css = applyNodeStyle({ typography: { role: 'h1', size: 64 } });
            expect(css['font-size']).toBe('64px');
        });

        // final-review fix (Important #4): typography.role previously resolved font-size/weight/
        // line-height/letter-spacing but never font-family, even though the theme layer already
        // injects --font-display/--font-body custom properties and loads their Google Font
        // <link>s — nothing ever consumed them.
        it('applies the theme\'s display font-family for a heading-shaped role (display/h1-h4)', () => {
            expect(applyNodeStyle({ typography: { role: 'display' } })['font-family']).toBe('var(--font-display)');
            expect(applyNodeStyle({ typography: { role: 'h1' } })['font-family']).toBe('var(--font-display)');
            expect(applyNodeStyle({ typography: { role: 'h4' } })['font-family']).toBe('var(--font-display)');
        });

        it('applies the theme\'s body font-family for a body-shaped role (bodyLg/body/small/caption)', () => {
            expect(applyNodeStyle({ typography: { role: 'bodyLg' } })['font-family']).toBe('var(--font-body)');
            expect(applyNodeStyle({ typography: { role: 'body' } })['font-family']).toBe('var(--font-body)');
            expect(applyNodeStyle({ typography: { role: 'caption' } })['font-family']).toBe('var(--font-body)');
        });

        it('an explicit typography.fontFamily still wins over the role\'s font-family default', () => {
            const css = applyNodeStyle({ typography: { role: 'h1', fontFamily: 'Comic Sans MS' } });
            expect(css['font-family']).toBe('Comic Sans MS');
        });

        it('typography.role="body": applies max-width:65ch measure', () => {
            const css = applyNodeStyle({ typography: { role: 'body' } });
            expect(css['max-width']).toBe('65ch');
        });

        it('typography.role="body" WITH explicit size.width: measure is skipped (explicit wins)', () => {
            const css = applyNodeStyle({ typography: { role: 'body' }, size: { width: '400px' } });
            expect(css['max-width']).toBeUndefined();
        });

        it('typography.role="h1": applies text-wrap:balance', () => {
            const css = applyNodeStyle({ typography: { role: 'h1' } });
            expect(css['text-wrap']).toBe('balance');
        });
    });

    describe('image (Phase 4 art-direction)', () => {
        it('image.aspectRatio "16:9": emits aspect-ratio', () => {
            const css = applyNodeStyle({ image: { aspectRatio: '16:9' } });
            expect(css['aspect-ratio']).toBe('16 / 9');
        });

        it('image.aspectRatio "1:1": emits 1 / 1', () => {
            const css = applyNodeStyle({ image: { aspectRatio: '1:1' } });
            expect(css['aspect-ratio']).toBe('1 / 1');
        });

        it('image.focalPoint: emits object-position as percentages', () => {
            const css = applyNodeStyle({ image: { focalPoint: { x: 30, y: 70 } } });
            expect(css['object-position']).toBe('30% 70%');
        });

        it('image.mask "circle": emits clip-path', () => {
            const css = applyNodeStyle({ image: { mask: 'circle' } });
            expect(css['clip-path']).toBe('circle(50% at 50% 50%)');
        });

        it('image.mask "diagonal": emits the diagonal polygon', () => {
            const css = applyNodeStyle({ image: { mask: 'diagonal' } });
            expect(css['clip-path']).toBe('polygon(0 0, 100% 0, 100% 85%, 0 100%)');
        });

        it('image.mask "none" or unset: no clip-path', () => {
            expect(applyNodeStyle({ image: { mask: 'none' } })['clip-path']).toBeUndefined();
            expect(applyNodeStyle({})['clip-path']).toBeUndefined();
        });

        it('image.treatment "grayscale": adds grayscale(1) to filter', () => {
            const css = applyNodeStyle({ image: { treatment: 'grayscale' } });
            expect(css.filter).toBe('grayscale(1)');
        });

        it('image.treatment "duotone": also adds grayscale(1) to filter (the overlay div handles the color)', () => {
            const css = applyNodeStyle({ image: { treatment: 'duotone', duotone: { from: '#000', to: '#fff' } } });
            expect(css.filter).toBe('grayscale(1)');
        });

        it('image.treatment "none" or unset: no filter from image', () => {
            expect(applyNodeStyle({ image: { treatment: 'none' } }).filter).toBeUndefined();
        });

        it('image.treatment grayscale COMBINED with effects.blur: both filters present, order preserved (blur then grayscale)', () => {
            const css = applyNodeStyle({ effects: { blur: 4 }, image: { treatment: 'grayscale' } });
            expect(css.filter).toBe('blur(4px) grayscale(1)');
        });

        it('image.treatment grayscale COMBINED with effects.grayscale: both grayscale filter functions present (not deduped, harmless — CSS applies both)', () => {
            const css = applyNodeStyle({ effects: { grayscale: 50 }, image: { treatment: 'grayscale' } });
            expect(css.filter).toBe('grayscale(50%) grayscale(1)');
        });
    });
});
