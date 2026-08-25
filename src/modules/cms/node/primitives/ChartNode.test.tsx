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

beforeAll(async () => {
    ({ ChartNode } = await import('./ChartNode'));
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
});
