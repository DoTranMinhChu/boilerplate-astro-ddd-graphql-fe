// src/modules/cms/node/primitives/CardListNode.test.tsx
// @vitest-environment jsdom
//
// CardListNode's first test file. Post-Phase-8 visual-quality dogfooding pass: covers the 2 real
// fixes made in this pass — (1) a numeric "Phụ đề" slot value (every listing/related Card List
// built this session binds a price field there) now renders formatted, not raw; (2) the whole
// card is now the click target when `linkToDetail` resolved an `entry.__detailHref`, instead of
// requiring a separate `ctaLabelField` text link (which no listing built this session had
// configured, so cards were never actually clickable in practice before this fix).
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';
import type { NodeTree, NodeRenderContext } from '../node.types';

vi.mock('../nodeDataBinding', () => ({
    fetchRepeatEntries: vi.fn(),
    fetchRepeatEntryCount: vi.fn(async () => 0),
}));

import { CardListNode } from './CardListNode';
import { fetchRepeatEntries } from '../nodeDataBinding';

function node(props: Record<string, any>, slots: Record<string, any>): NodeTree {
    return {
        id: 'n1', pageId: 'p1', parentId: undefined, order: 0, type: 'card-list',
        layoutMode: 'flow', style: {}, layout: {},
        props: { slots, columns: 3 },
        repeat: { source: 'own', mode: 'dynamic', cardinality: 'many', contentTypeKey: 'ct-1', ...props },
        responsiveOverrides: {}, createdAt: '', updatedAt: '', deletedAt: undefined,
        animationRef: undefined, children: [],
    } as unknown as NodeTree;
}

function context(): NodeRenderContext {
    return {
        contextEntry: {}, isCustomerLoggedIn: false, device: () => 'desktop',
        queryParams: {}, pathParams: {}, now: new Date(),
    } as NodeRenderContext;
}

describe('CardListNode — price formatting + whole-card click-through (Post-Phase-8 dogfooding fix)', () => {
    it('formats a numeric subtitle slot value bound to a "gia"-keyed field as Vietnamese currency, not the raw number', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([
            { id: 'p1', data: { ten: 'Hạt khô cao cấp', anh: 'https://x/img.jpg', gia: 320000 } },
        ]);
        const n = node({}, { imageField: 'anh', titleField: 'ten', subtitleField: 'gia' });
        const { findByText, queryByText } = render(() => <CardListNode node={n} context={context()} />);

        await findByText('320.000 ₫');
        expect(queryByText('320000')).toBeNull();
    });

    it('wraps the whole card in a link to entry.__detailHref when linkToDetail resolved one', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([
            { id: 'p1', data: { ten: 'Hạt khô cao cấp', gia: 320000 }, __detailHref: '/bao-boi-pet-spa/san-pham/hat-kho-cao-cap' },
        ]);
        const n = node({}, { titleField: 'ten', subtitleField: 'gia' });
        const { findByText } = render(() => <CardListNode node={n} context={context()} />);

        const title = await findByText('Hạt khô cao cấp');
        const link = title.closest('a');
        expect(link?.getAttribute('href')).toBe('/bao-boi-pet-spa/san-pham/hat-kho-cao-cap');
    });

    it('renders a plain (unlinked) card when the entry has no __detailHref (linkToDetail off / not configured)', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([
            { id: 'p1', data: { ten: 'Hạt khô cao cấp', gia: 320000 } },
        ]);
        const n = node({}, { titleField: 'ten', subtitleField: 'gia' });
        const { findByText } = render(() => <CardListNode node={n} context={context()} />);

        const title = await findByText('Hạt khô cao cấp');
        expect(title.closest('a')).toBeNull();
    });

    it('does not format a non-numeric subtitle slot value (e.g. a plain text field bound there)', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([
            { id: 'p1', data: { ten: 'Hạt khô cao cấp', mota: 'Vị cá hồi' } },
        ]);
        const n = node({}, { titleField: 'ten', subtitleField: 'mota' });
        const { findByText } = render(() => <CardListNode node={n} context={context()} />);

        await findByText('Vị cá hồi');
    });

    it('waits for the mocked fetch to resolve before asserting nothing rendered from stale/empty state', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([]);
        const n = node({}, { titleField: 'ten' });
        const { queryByRole } = render(() => <CardListNode node={n} context={context()} />);
        await waitFor(() => expect(fetchRepeatEntries).toHaveBeenCalled());
        expect(queryByRole('link')).toBeNull();
    });
});

describe('CardListNode — responsive column count (real bug found live: hardcoded desktop columns() rendered unchanged at 390px, cards squeezed to ~110px each)', () => {
    function contextFor(device: 'desktop' | 'tablet' | 'mobile'): NodeRenderContext {
        return {
            contextEntry: {}, isCustomerLoggedIn: false, device: () => device,
            queryParams: {}, pathParams: {}, now: new Date(),
        } as NodeRenderContext;
    }

    it('renders the admin-configured column count unchanged on desktop', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([{ id: 'p1', data: { ten: 'Sản phẩm A' } }]);
        const n = node({}, { titleField: 'ten' });
        const { findByText, container } = render(() => <CardListNode node={n} context={contextFor('desktop')} />);
        await findByText('Sản phẩm A');
        const grid = container.querySelector('[style*="grid-template-columns"]');
        expect(grid?.getAttribute('style')).toContain('repeat(3, minmax(0, 1fr))');
    });

    it('caps columns at 2 on tablet even though the admin configured 3', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([{ id: 'p1', data: { ten: 'Sản phẩm A' } }]);
        const n = node({}, { titleField: 'ten' });
        const { findByText, container } = render(() => <CardListNode node={n} context={contextFor('tablet')} />);
        await findByText('Sản phẩm A');
        const grid = container.querySelector('[style*="grid-template-columns"]');
        expect(grid?.getAttribute('style')).toContain('repeat(2, minmax(0, 1fr))');
    });

    it('does NOT grow columns on tablet when the admin configured fewer than 2 (e.g. a 1-column featured list)', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([{ id: 'p1', data: { ten: 'Sản phẩm A' } }]);
        const n = node({}, { titleField: 'ten' });
        n.props!.columns = 1;
        const { findByText, container } = render(() => <CardListNode node={n} context={contextFor('tablet')} />);
        await findByText('Sản phẩm A');
        const grid = container.querySelector('[style*="grid-template-columns"]');
        expect(grid?.getAttribute('style')).toContain('repeat(1, minmax(0, 1fr))');
    });

    it('collapses to a single column on mobile regardless of the admin-configured desktop column count', async () => {
        vi.mocked(fetchRepeatEntries).mockResolvedValue([{ id: 'p1', data: { ten: 'Sản phẩm A' } }]);
        const n = node({}, { titleField: 'ten' });
        const { findByText, container } = render(() => <CardListNode node={n} context={contextFor('mobile')} />);
        await findByText('Sản phẩm A');
        const grid = container.querySelector('[style*="grid-template-columns"]');
        expect(grid?.getAttribute('style')).toContain('repeat(1, minmax(0, 1fr))');
    });
});
