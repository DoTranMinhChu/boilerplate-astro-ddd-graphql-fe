// src/modules/cms/node/primitives/StatMetricsNode.tsx
import { For, onCleanup, onMount, createSignal } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import '../../sections/editorialEffects.css';

const _ = animate;

export interface StatMetric {
    value?: number;
    suffix?: string;
    label?: string;
}

export interface StatMetricsNodeContent {
    heading?: string;
    metrics?: StatMetric[];
}

function CountUpValue(props: { target: number; durationMs?: number }) {
    const [display, setDisplay] = createSignal(0);
    let ref: HTMLSpanElement | undefined;
    let observer: IntersectionObserver | undefined;

    onMount(() => {
        if (!ref) return;
        observer = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            observer?.disconnect();
            const duration = props.durationMs ?? 1400;
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min(1, (now - start) / duration);
                setDisplay(Math.round(props.target * (1 - Math.pow(1 - progress, 3))));
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, { threshold: 0.4 });
        observer.observe(ref);
    });
    onCleanup(() => observer?.disconnect());

    return <span ref={ref}>{display()}</span>;
}

/** Node primitive tương đương `StatMetricsSection.tsx` — giữ nguyên `CountUpValue`
 * (`IntersectionObserver` threshold 0.4, duration 1400ms, easing cubic). */
export function StatMetricsNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as StatMetricsNodeContent;
    const metrics = () => content().metrics || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[1720px] px-[5vw]">
                <h2 use:animate={getLayerForNode(props.node, 'heading')} class="m-0 mb-16 text-center font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayerForNode(props.node, 'metrics')} class="grid grid-cols-2 gap-10 md:grid-cols-4">
                    <For each={metrics()}>
                        {(m) => (
                            <div class="text-center">
                                <p class="m-0 font-bold tracking-tight" style={{ 'font-size': 'clamp(36px, 4vw, 64px)' }}>
                                    <CountUpValue target={m.value ?? 0} />{m.suffix}
                                </p>
                                <p class="mt-2 text-sm text-[#9b9b9b]">{m.label}</p>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </section>
    );
}
