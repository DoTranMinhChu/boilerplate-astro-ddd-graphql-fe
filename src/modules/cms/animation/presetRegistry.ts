import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EAnimationPreset, EAnimationSpeed } from '@/modules/cms/cms.constants';
import type { AnimationLayer } from '@/modules/cms/cms.types';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const SPEED_SECONDS: Record<NonNullable<AnimationLayer['speed']>, number> = {
    [EAnimationSpeed.SLOW]: 1.2,
    [EAnimationSpeed.MEDIUM]: 0.8,
    [EAnimationSpeed.FAST]: 0.5,
};

function baseVars(layer: AnimationLayer) {
    return {
        duration: SPEED_SECONDS[layer.speed || EAnimationSpeed.MEDIUM],
        delay: (layer.delay || 0) / 1000,
        ease: 'power2.out',
    };
}

function scrollTriggerFor(el: Element, layer: AnimationLayer) {
    const once = (layer.trigger || 'viewport-once') !== 'repeat';
    return {
        trigger: el,
        start: 'top 85%',
        toggleActions: once ? 'play none none none' : 'play reverse play reverse',
        once,
    };
}

// Preset registry — mỗi preset chỉ nhận (el, layer), không expose easing/transform
// tuỳ ý cho admin (mục 8 spec CMS: admin chỉ chọn preset/speed/delay/trigger).
export const presetRegistry: Record<string, (el: Element, layer: AnimationLayer) => void> = {
    [EAnimationPreset.NONE]: () => { },

    [EAnimationPreset.FADE_IN]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.FADE_UP]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0, y: 32 }, { opacity: 1, y: 0, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.FADE_DOWN]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0, y: -32 }, { opacity: 1, y: 0, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.SLIDE_LEFT]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0, x: 48 }, { opacity: 1, x: 0, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.SLIDE_RIGHT]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0, x: -48 }, { opacity: 1, x: 0, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.SCALE_IN]: (el, layer) => {
        gsap.fromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) });
    },
    [EAnimationPreset.TEXT_REVEAL]: (el, layer) => {
        gsap.fromTo(
            el,
            { opacity: 0, y: 24, clipPath: 'inset(0 0 100% 0)' },
            { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', ...baseVars(layer), scrollTrigger: scrollTriggerFor(el, layer) },
        );
    },
    [EAnimationPreset.STAGGER_CHILDREN]: (el, layer) => {
        gsap.fromTo(
            (el as HTMLElement).children,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, ...baseVars(layer), stagger: 0.12, scrollTrigger: scrollTriggerFor(el, layer) },
        );
    },
};
