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

    it('maps size to width/height/min-width/max-width', () => {
        const css = applyNodeStyle({ size: { width: '100%', height: '400px', minW: '200px', maxW: '800px' } });
        expect(css.width).toBe('100%');
        expect(css.height).toBe('400px');
        expect(css['min-width']).toBe('200px');
        expect(css['max-width']).toBe('800px');
    });

    it('maps typography fields to their CSS equivalents', () => {
        const css = applyNodeStyle({ typography: { fontFamily: 'Inter', size: 18, weight: 600, lineHeight: 1.5, letterSpacing: 0.2, color: '#111', align: 'center', transform: 'uppercase', decoration: 'underline' } });
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
        const style = { typography: { color: '#111' } };
        expect(applyNodeStyle(style)).toEqual(applyNodeStyle(style, undefined, 'desktop'));
    });

    it('merges only the tablet override at breakpoint "tablet"', () => {
        const style = { typography: { color: '#111', size: 16 } };
        const overrides = { tablet: { style: { typography: { size: 20 } } }, mobile: { style: { typography: { size: 12 } } } };
        const css = applyNodeStyle(style, overrides, 'tablet');
        expect(css['font-size']).toBe('20px');
    });

    it('cascades tablet then mobile at breakpoint "mobile" (tablet applies first, mobile can override further)', () => {
        const style = { typography: { color: '#111', size: 16 } };
        const overrides = { tablet: { style: { typography: { color: '#222' } } }, mobile: { style: { typography: { size: 12 } } } };
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
});
