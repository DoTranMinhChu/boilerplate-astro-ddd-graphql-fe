// src/modules/cms/node/primitives/ChartNode.tsx
//
// Node-level data binding (2026-08-17-era pattern) — self-contained primitive: resolves +
// iterates `node.repeat` INTERNALLY (its own SVG, N points), mirroring TableNode.tsx/
// CardListNode.tsx's "single createResource, plain arrow-function source" shape — see those
// files' header comments for the 2 real live bugs (2 sibling resources; wrapping the source in
// `createMemo`) that shape avoids. `ENodeType.CHART` is in `SELF_RESOLVING_REPEAT_NODE_TYPES`
// (node.constants.ts), so it never receives pre-fetched entries via `NodeChildrenList`'s
// generic path — this component must fetch its own data when `seriesMode==='repeat'`.
import { createResource, Show, For, createMemo } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { fetchRepeatEntries } from '../nodeDataBinding';
import { resolveChartSeries, type ChartPoint } from '../resolveChartSeries';

const DEFAULT_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308'];

function buildLinePath(points: ChartPoint[], width: number, height: number, padding: number): { linePath: string; areaPath: string } {
    if (!points.length) return { linePath: '', areaPath: '' };
    const max = Math.max(...points.map((p) => p.value), 1);
    const min = Math.min(...points.map((p) => p.value), 0);
    const range = max - min || 1;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
        const x = padding + i * stepX;
        const y = padding + innerH - ((p.value - min) / range) * innerH;
        return [x, y] as const;
    });
    const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1][0]},${padding + innerH} L${coords[0][0]},${padding + innerH} Z`;
    return { linePath, areaPath };
}

/** A slice that covers the WHOLE circle cannot be drawn as one arc. Its start and end angles
 * coincide (`endAngle === startAngle + 2π`), so the two endpoint coordinates land on the same
 * spot — separated only by ~1e-14 of floating-point noise from `cos`/`sin`. Per the SVG spec
 * an elliptical arc whose endpoints are IDENTICAL is omitted entirely, and one whose endpoints
 * are merely 1e-14 apart is barely better: the arc is geometrically degenerate, its center
 * parameterization is numerically unstable, and what a renderer draws for it is not something
 * to rely on. Either way, the ring was never a ring.
 * (Final-review fix: this hit every single-data-point donut, and every donut where one point
 * happened to hold 100% of the total.)
 *
 * Drawn instead as two well-conditioned 180° arcs for the outer edge plus two counter-rotating
 * 180° arcs for the inner edge — no endpoint ever coincides with its own start. The opposite
 * sweep direction punches the hole via the default nonzero fill-rule, the same trick the wedge
 * path below uses when it walks its inner arc backwards. */
function buildFullRingPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number): string {
    const at = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    const mid = startAngle + Math.PI;
    return [
        `M${at(rOuter, startAngle)}`,
        `A${rOuter},${rOuter} 0 1 1 ${at(rOuter, mid)}`,
        `A${rOuter},${rOuter} 0 1 1 ${at(rOuter, startAngle)}`,
        'Z',
        `M${at(rInner, startAngle)}`,
        `A${rInner},${rInner} 0 1 0 ${at(rInner, mid)}`,
        `A${rInner},${rInner} 0 1 0 ${at(rInner, startAngle)}`,
        'Z',
    ].join(' ');
}

export function buildDonutSlices(points: ChartPoint[], size: number, thickness: number): Array<{ path: string; color: string }> {
    const total = points.reduce((sum, p) => sum + Math.max(p.value, 0), 0);
    if (!total) return [];
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2;
    const rInner = rOuter - thickness;
    let angle = -Math.PI / 2;
    return points.map((p, i) => {
        const fraction = Math.max(p.value, 0) / total;
        const startAngle = angle;
        const endAngle = angle + fraction * Math.PI * 2;
        angle = endAngle;
        const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        // Epsilon, not `=== 1`: one positive point among zeroes divides a number by itself
        // (exactly 1), but a summed total can land a hair under it through float error.
        if (fraction >= 1 - 1e-9) {
            return { path: buildFullRingPath(cx, cy, rOuter, rInner, startAngle), color };
        }
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        const p1Outer = [cx + rOuter * Math.cos(startAngle), cy + rOuter * Math.sin(startAngle)];
        const p2Outer = [cx + rOuter * Math.cos(endAngle), cy + rOuter * Math.sin(endAngle)];
        const p1Inner = [cx + rInner * Math.cos(endAngle), cy + rInner * Math.sin(endAngle)];
        const p2Inner = [cx + rInner * Math.cos(startAngle), cy + rInner * Math.sin(startAngle)];
        const path = [
            `M${p1Outer[0]},${p1Outer[1]}`,
            `A${rOuter},${rOuter} 0 ${largeArc} 1 ${p2Outer[0]},${p2Outer[1]}`,
            `L${p1Inner[0]},${p1Inner[1]}`,
            `A${rInner},${rInner} 0 ${largeArc} 0 ${p2Inner[0]},${p2Inner[1]}`,
            'Z',
        ].join(' ');
        return { path, color };
    });
}

export function ChartNode(props: NodeComponentProps) {
    const variant = () => (props.node.props?.variant as 'line' | 'donut') ?? 'line';
    const seriesMode = () => (props.node.props?.seriesMode as 'static' | 'repeat') ?? 'static';
    const strokeColor = () => (props.node.props?.strokeColor as string) ?? DEFAULT_COLORS[0];
    const showLegend = () => props.node.props?.showLegend !== false;

    // Single `createResource`, PLAIN arrow-function source (not `createMemo`-wrapped) — see
    // TableNode.tsx's header comment for why this exact shape is required for correct SSR
    // Suspense behavior. Source returns `null` (skipping the fetch entirely) when this Chart
    // isn't repeat-bound, same "no repeat -> no-op fetcher" pattern as every other self-resolving
    // list primitive.
    const [entries] = createResource(
        () => (seriesMode() === 'repeat' && props.node.repeat ? props.node.repeat : null),
        async (repeat) => fetchRepeatEntries(repeat, {
            locale: props.context.locale,
            pathParams: props.context.pathParams,
            queryParams: props.context.queryParams,
            contextEntryId: props.context.contextEntryId,
        }),
    );

    const points = createMemo<ChartPoint[]>(() => resolveChartSeries(
        {
            mode: seriesMode(),
            // Deliberately NOT cast to `ChartPoint[]` — `resolveChartSeries` takes `unknown`
            // here and normalizes. This used to be `as ChartPoint[] | undefined`, which is
            // what let a raw string (the old `code` control's output) reach `points()` and
            // blow up every consumer below. See resolveChartSeries.ts's own comment.
            staticSeries: props.node.props?.staticSeries,
            labelField: props.node.props?.labelField as string | undefined,
            valueField: props.node.props?.valueField as string | undefined,
        },
        entries() ?? [],
    ));

    const style = () => applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device());
    const width = 320;
    const height = 180;

    return (
        <div style={style()} class="flex flex-col gap-2">
            <Show when={variant() === 'line'}>
                <svg viewBox={`0 0 ${width} ${height}`} class="w-full h-auto">
                    {(() => {
                        const { linePath, areaPath } = buildLinePath(points(), width, height, 16);
                        return (
                            <>
                                <path d={areaPath} fill={strokeColor()} opacity="0.12" />
                                <path d={linePath} fill="none" stroke={strokeColor()} stroke-width="2" />
                            </>
                        );
                    })()}
                </svg>
            </Show>
            <Show when={variant() === 'donut'}>
                <svg viewBox="0 0 160 160" class="w-40 h-40 mx-auto">
                    <For each={buildDonutSlices(points(), 160, 24)}>
                        {(slice) => <path d={slice.path} fill={slice.color} />}
                    </For>
                </svg>
            </Show>
            <Show when={showLegend()}>
                <ul class="flex flex-wrap gap-3 text-xs">
                    <For each={points()}>
                        {(point, i) => (
                            <li class="flex items-center gap-1.5">
                                <span
                                    class="inline-block w-2 h-2 rounded-full"
                                    style={{ background: variant() === 'donut' ? DEFAULT_COLORS[i() % DEFAULT_COLORS.length] : strokeColor() }}
                                />
                                {point.label}: {point.value}
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
