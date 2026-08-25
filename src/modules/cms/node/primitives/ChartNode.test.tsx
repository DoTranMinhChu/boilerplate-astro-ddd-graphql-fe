// src/modules/cms/node/primitives/ChartNode.test.tsx
// @vitest-environment jsdom
//
// ChartNode.tsx transitively imports nodeRegistry.ts-adjacent modules that pull in GSAP —
// copy the exact matchMedia polyfill + beforeAll-dynamic-import pattern NodePalette.test.tsx
// already uses for the same reason (see its own header comment) rather than reinventing it.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@solidjs/testing-library';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

vi.mock('../nodeDataBinding', () => ({
    fetchRepeatEntries: vi.fn(async () => [
        { data: { month: 'Jan', revenue: 100 } },
        { data: { month: 'Feb', revenue: 150 } },
    ]),
}));

let ChartNode: typeof import('./ChartNode')['ChartNode'];
let buildDonutSlices: typeof import('./ChartNode')['buildDonutSlices'];

beforeAll(async () => {
    ({ ChartNode, buildDonutSlices } = await import('./ChartNode'));
}, 30000);

function makeContext() {
    return {
        device: () => 'desktop' as const,
        locale: 'vi',
        pathParams: {},
        queryParams: {},
        isCustomerLoggedIn: false,
        now: new Date(),
    } as any;
}

describe('ChartNode', () => {
    it('renders an SVG line path for variant:line with a static series', async () => {
        const { container, findByText } = render(() => (
            <ChartNode
                node={{ id: 'n1', props: { variant: 'line', seriesMode: 'static', staticSeries: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }] }, style: {} } as any}
                context={makeContext()}
            />
        ));
        expect(container.querySelector('svg path')).toBeTruthy();
        expect(await findByText(/Jan: 10/)).toBeTruthy();
    });

    it('renders donut slices for variant:donut', async () => {
        const { container } = render(() => (
            <ChartNode
                node={{ id: 'n2', props: { variant: 'donut', seriesMode: 'static', staticSeries: [{ label: 'A', value: 5 }, { label: 'B', value: 5 }] }, style: {} } as any}
                context={makeContext()}
            />
        ));
        expect(container.querySelectorAll('svg path').length).toBe(2);
    });

    it('resolves series from a repeat binding via fetchRepeatEntries, mapping labelField/valueField', async () => {
        const { findByText } = render(() => (
            <ChartNode
                node={{ id: 'n3', props: { variant: 'line', seriesMode: 'repeat', labelField: 'month', valueField: 'revenue' }, style: {}, repeat: { source: 'own', contentTypeKey: 'sales' } } as any}
                context={makeContext()}
            />
        ));
        expect(await findByText(/Jan: 100/)).toBeTruthy();
        expect(await findByText(/Feb: 150/)).toBeTruthy();
    });

    it('hides the legend when showLegend is false', () => {
        const { queryByText } = render(() => (
            <ChartNode
                node={{ id: 'n4', props: { variant: 'line', seriesMode: 'static', staticSeries: [{ label: 'Jan', value: 10 }], showLegend: false }, style: {} } as any}
                context={makeContext()}
            />
        ));
        expect(queryByText(/Jan: 10/)).toBeNull();
    });

    // Final-review fix (Critical): the `staticSeries` Inspector field used to be a `code`
    // control persisting the RAW STRING typed into it, while this component consumed it as
    // `ChartPoint[]` — `points.map is not a function`, swallowed by the per-node
    // ErrorBoundary, chart silently blank on the DEFAULT authoring path. The field is now a
    // repeater (array of rows); these cover both what it produces NOW and the legacy string
    // still sitting in already-authored nodes.
    describe('staticSeries shapes the Inspector field actually produces', () => {
        it('renders from the repeater control\'s array-of-rows output', async () => {
            const { container, findByText } = render(() => (
                <ChartNode
                    node={{ id: 'n5', props: { variant: 'line', seriesMode: 'static', staticSeries: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }] }, style: {} } as any}
                    context={makeContext()}
                />
            ));
            expect(container.querySelector('svg path[stroke]')?.getAttribute('d')).toMatch(/^M[\d.]+,[\d.]+ L/);
            expect(await findByText(/Feb: 20/)).toBeTruthy();
        });

        it('renders a half-filled repeater row (value not typed yet) as value 0 instead of blanking', async () => {
            const { findByText } = render(() => (
                <ChartNode
                    node={{ id: 'n6', props: { variant: 'line', seriesMode: 'static', staticSeries: [{ label: 'Jan', value: 10 }, { label: 'Feb' }] }, style: {} } as any}
                    context={makeContext()}
                />
            ));
            expect(await findByText(/Feb: 0/)).toBeTruthy();
        });

        it('still renders a legacy raw JSON string without throwing', async () => {
            const { container, findByText } = render(() => (
                <ChartNode
                    node={{ id: 'n7', props: { variant: 'line', seriesMode: 'static', staticSeries: '[{"label":"Jan","value":10},{"label":"Feb","value":20}]' }, style: {} } as any}
                    context={makeContext()}
                />
            ));
            expect(container.querySelector('svg path[stroke]')?.getAttribute('d')).toBeTruthy();
            expect(await findByText(/Jan: 10/)).toBeTruthy();
        });

        it('renders an empty chart (not a crash) for malformed legacy JSON', () => {
            expect(() => render(() => (
                <ChartNode
                    node={{ id: 'n8', props: { variant: 'line', seriesMode: 'static', staticSeries: 'not json at all' }, style: {} } as any}
                    context={makeContext()}
                />
            ))).not.toThrow();
        });
    });

    // Final-review fix (Important): with one point holding 100% of the total, the arc's start
    // and end angles coincide, so both endpoint coordinates are identical — per the SVG spec
    // an elliptical arc with identical endpoints is OMITTED ENTIRELY and the whole ring
    // rendered as nothing.
    describe('single-slice donut', () => {
        it('renders a non-degenerate ring for a one-point series', () => {
            const { container } = render(() => (
                <ChartNode
                    node={{ id: 'n9', props: { variant: 'donut', seriesMode: 'static', staticSeries: [{ label: 'Only', value: 42 }] }, style: {} } as any}
                    context={makeContext()}
                />
            ));
            const paths = container.querySelectorAll('svg path');
            expect(paths.length).toBe(1);
            const d = paths[0].getAttribute('d') ?? '';
            // Two subpaths (outer ring + reverse-swept inner ring punching the hole)...
            expect((d.match(/M/g) ?? []).length).toBe(2);
            // ...and four real arc commands, none of which may land back on its own start point.
            const arcs = d.match(/A[^AMZ]+/g) ?? [];
            expect(arcs.length).toBe(4);
            const endpoints = arcs.map((a) => a.trim().split(' ').pop()!);
            expect(new Set(endpoints).size).toBeGreaterThan(1);
        });

        it('buildDonutSlices emits no near-degenerate arc when one point holds 100%', () => {
            const [slice] = buildDonutSlices([{ label: 'Only', value: 7 }], 160, 24);
            expect(slice).toBeTruthy();
            // Walk the path tracking the current point, and require every `A` command to end
            // MEANINGFULLY away from where it started. This is the exact defect the fix
            // targets: the old single-arc-per-slice form put a full-circle slice's two
            // endpoints ~1e-14 apart, which is a degenerate arc (identical endpoints are
            // omitted outright per the SVG spec; near-identical ones are numerically
            // unstable). Threshold is in user units on a 160-unit-wide viewBox.
            const parse = (s: string) => s.split(',').map(Number) as [number, number];
            const commands = slice.path.match(/[MALZ][^MALZ]*/g) ?? [];
            let current: [number, number] = [0, 0];
            let arcsChecked = 0;
            for (const cmd of commands) {
                if (cmd[0] === 'Z') continue;
                const endpoint = parse(cmd.trim().slice(1).split(' ').pop()!);
                if (cmd[0] === 'A') {
                    const dist = Math.hypot(endpoint[0] - current[0], endpoint[1] - current[1]);
                    expect(dist, `degenerate arc "${cmd.trim()}" in ${slice.path}`).toBeGreaterThan(1);
                    arcsChecked++;
                }
                current = endpoint;
            }
            expect(arcsChecked).toBe(4);
        });

        it('also handles a multi-point series where one point holds 100% and the rest are zero', () => {
            const slices = buildDonutSlices([{ label: 'A', value: 0 }, { label: 'B', value: 9 }, { label: 'C', value: 0 }], 160, 24);
            expect(slices.length).toBe(3);
            // The 100% slice is the full-ring form (2 subpaths); the zero slices are not.
            expect((slices[1].path.match(/M/g) ?? []).length).toBe(2);
        });

        it('leaves ordinary multi-slice donuts on the single-wedge path (unchanged behavior)', () => {
            const slices = buildDonutSlices([{ label: 'A', value: 5 }, { label: 'B', value: 5 }], 160, 24);
            expect(slices.length).toBe(2);
            slices.forEach((s) => expect((s.path.match(/M/g) ?? []).length).toBe(1));
        });
    });
});
