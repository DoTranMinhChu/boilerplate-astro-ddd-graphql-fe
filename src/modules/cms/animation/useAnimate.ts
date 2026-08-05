import { onCleanup, onMount } from 'solid-js';
import { gsap } from 'gsap';
import { presetRegistry } from './presetRegistry';
import { EAnimationPreset } from '@/modules/cms/cms.constants';
import type { AnimationLayer } from '@/modules/cms/cms.types';

const MOBILE_BREAKPOINT = 768;

/**
 * Solid custom directive: `use:animate={layer}` — layer là 1 AnimationLayer
 * (mục 8 spec CMS). Admin chỉ cấu hình preset/speed/delay/trigger/mobileEnabled
 * qua CMS; GSAP timeline cụ thể nằm cố định trong presetRegistry, không phải
 * config có thể admin can thiệp.
 */
export function animate(el: Element, value: () => AnimationLayer | undefined | null) {
    onMount(() => {
        const layer = value();
        if (!layer || !layer.preset || layer.preset === EAnimationPreset.NONE) return;
        if (layer.mobileEnabled === false && window.innerWidth < MOBILE_BREAKPOINT) return;

        const run = presetRegistry[layer.preset];
        if (!run) return;

        const ctx = gsap.context(() => run(el, layer));
        onCleanup(() => ctx.revert());
    });
}

// Đăng ký type cho JSX (`use:animate`).
declare module 'solid-js' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface Directives {
            animate: AnimationLayer | undefined | null;
        }
    }
}
