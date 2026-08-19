// @vitest-environment jsdom
//
// Named `.test.tsx` (not `.test.ts`) — renders real JSX (`<NodeDataSourceTab .../>`), same
// reasoning ContentDetailLayoutTab.test.tsx/RepeaterFieldEditor.test.tsx already established
// for this project (vitest.config.ts's `include` covers `src/**/*.test.tsx`).
//
// This is NodeDataSourceTab's first test file (previously untested) — covers ONLY the new
// Group 2 slot-editor branches added in Canvas Editor v2 Task 13 (FeaturedEntry/ProjectShowcase/
// LogoGrid/MixedFeed), not a full re-test of the pre-existing TABLE/CARD_LIST/filter behavior.
//
// `t()` (src/shared/i18n/t.ts) is NOT stubbed/mocked anywhere in this test environment — it's the
// real dictionary lookup, defaulting to the 'vi' locale (no `localStorage` in a fresh jsdom
// document, see src/shared/i18n/locale.ts's `readStoredLocale`). Assertions below check the real
// Vietnamese strings (matching ContentDetailLayoutTab.test.tsx's established convention of
// asserting translated text, not raw i18n keys) instead of the brief's raw-key sketch.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeDataSourceTab } from './NodeDataSourceTab';

describe('NodeDataSourceTab — Group 2 slot editors (Canvas Editor v2, Task 13)', () => {
    it('renders the FeaturedEntry slot editor when nodeType is featured-entry and a content type is chosen', () => {
        const onColumnsOrSlotsChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'own', mode: 'dynamic', cardinality: 'one', contentTypeKey: 'ct-1' }}
                nodeType="featured-entry"
                onChange={vi.fn()}
                columnsOrSlots={{ slots: {} }}
                onColumnsOrSlotsChange={onColumnsOrSlotsChange}
            />
        ));
        // slotsLabel is shared (already-existing key, reused by SimpleSlotsEditor) — 'Bố cục thẻ'.
        expect(getByText('Bố cục thẻ')).toBeTruthy();
    });

    // `cardinality: 'one'` here is unrelated to what's under test — it's set purely to steer
    // NodeDataSourceTab into its `onNotFound` <Select> branch instead of the sibling
    // `limit`/pagination <InputNumber> branch. That InputNumber (a pre-existing, unrelated
    // shared control, not touched by Task 13) throws
    // `ReferenceError: Cannot access 'changeValueText' before initialization` when mounted in
    // THIS jsdom/vitest environment — reproduced in isolation, with zero NodeDataSourceTab code
    // involved, confirming it's a pre-existing environment/component quirk rather than anything
    // introduced here. Sidestepping it keeps this file's tests scoped to the new Task 13 branches.
    it('renders the mixed-source list editor when nodeType is mixed-feed, independent of contentTypeKey', () => {
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'mixed', cardinality: 'one', sources: [] }} nodeType="mixed-feed" onChange={vi.fn()} />
        ));
        expect(getByText('+ Thêm nguồn')).toBeTruthy();
    });

    it('adds a new mixed source row', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'mixed', cardinality: 'one', sources: [] }} nodeType="mixed-feed" onChange={onChange} />
        ));
        fireEvent.click(getByText('+ Thêm nguồn'));
        expect(onChange).toHaveBeenCalledWith({ source: 'mixed', cardinality: 'one', sources: [{ contentTypeId: '', fieldMapping: {} }] });
    });

    it('delete-row icons are permanently red, not hover-only (Node Builder Inspector Polish, Task 9)', () => {
        const { container } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'mixed', cardinality: 'one', sources: [{ contentTypeId: 'ct-1', fieldMapping: {} }] }}
                nodeType="mixed-feed"
                onChange={vi.fn()}
            />
        ));
        const trashIcons = container.querySelectorAll('[class*="text-red-500"]');
        expect(trashIcons.length).toBeGreaterThan(0);
    });
});

describe('NodeDataSourceTab — source picker (repeat-item-data-binding, 2026-08-19)', () => {
    it('renders the Content Type + filters fields when source is "own" (default)', () => {
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'own', mode: 'dynamic', cardinality: 'one', contentTypeKey: 'ct-1' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(getByText('Content Type')).toBeTruthy();
        expect(getByText('Điều kiện lọc')).toBeTruthy();
    });

    it('renders sourceContentTypeId + matchField fields when source is "backlink"', () => {
        const { getByText, queryByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'backlink', cardinality: 'one' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(getByText('Content Type nguồn')).toBeTruthy();
        expect(getByText('Trường khớp (matchField)')).toBeTruthy();
        expect(queryByText('Điều kiện lọc')).toBeNull();
    });

    it('renders relatedContentTypeKey + matchField + hint when source is "related"', () => {
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'related', cardinality: 'one' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(getByText('Content Type giả định')).toBeTruthy();
        expect(getByText('Trường khớp (matchField)')).toBeTruthy();
        expect(getByText(/Chỉ dùng để hiển thị danh sách field/)).toBeTruthy();
    });

    it('the source Select shows the resolved LABEL for the current repeat.source, proving it is genuinely wired (not a raw-value Input) — same pattern as NodeStyleTab.test.tsx\'s font-family Select check', () => {
        const { container } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'backlink', cardinality: 'one' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Tham chiếu ngược');
    });

    it('defaults the source Select to "own" (Content Type mặc định) when repeat.source is unset', () => {
        const { container } = render(() => (
            <NodeDataSourceTab repeat={{ mode: 'dynamic', cardinality: 'one', contentTypeKey: 'ct-1' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Content Type (mặc định)');
    });
});
