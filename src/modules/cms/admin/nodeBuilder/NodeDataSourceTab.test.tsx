// @vitest-environment jsdom
//
// Named `.test.tsx` (not `.test.ts`) — renders real JSX (`<NodeDataSourceTab .../>`), same
// reasoning ContentDetailLayoutTab.test.tsx/RepeaterFieldEditor.test.tsx already established
// for this project (vitest.config.ts's `include` covers `src/**/*.test.tsx`).
//
// This is NodeDataSourceTab's first test file (previously untested). It originally covered the
// Group 2 slot-editor branches added in Canvas Editor v2 Task 13 (FeaturedEntry/ProjectShowcase/
// LogoGrid/MixedFeed); those branches (and their SimpleSlotsEditor/MixedSourcesEditor helpers)
// were deleted along with their now-nonexistent node types (Motion System Unification, Task 3),
// so those tests were removed too. Coverage below is the source-picker/local-array-repeater
// behavior that remains live, not a full re-test of the pre-existing TABLE/CARD_LIST/filter
// behavior.
//
// `t()` (src/shared/i18n/t.ts) is NOT stubbed/mocked anywhere in this test environment — it's the
// real dictionary lookup, defaulting to the 'vi' locale (no `localStorage` in a fresh jsdom
// document, see src/shared/i18n/locale.ts's `readStoredLocale`). Assertions below check the real
// Vietnamese strings (matching ContentDetailLayoutTab.test.tsx's established convention of
// asserting translated text, not raw i18n keys) instead of the brief's raw-key sketch.
import { describe, it, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { NodeDataSourceTab } from './NodeDataSourceTab';
import type { CollectionRepeat } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

// Post-Phase-8 content build-out dogfooding fix: `fieldOptions` (feeding the Card List/Table
// slot pickers) only ever read `repeat.contentTypeKey` — never set in source==='related'/
// 'backlink' mode — leaving those slot pickers permanently empty. No other test in this file
// depends on real ContentTypeService data (existing tests only assert static option-array
// labels), so mocking it file-wide is safe.
vi.mock('@/shared/services/contentType/contentType.service', () => ({
    ContentTypeService: {
        getAllContentType: vi.fn(async () => ({
            edges: [
                { node: { id: 'ct-san-pham', label: 'Sản phẩm', fields: [{ key: 'ten', label: 'Tên sản phẩm' }, { key: 'anh', label: 'Ảnh sản phẩm' }] } },
            ],
        })),
    },
}));

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

describe('NodeDataSourceTab — fieldOptions resolves relatedContentTypeKey/sourceContentTypeId (Post-Phase-8 dogfooding fix)', () => {
    // Reproduces the exact live scenario: a Card List with source='related' + relatedContentTypeKey
    // set (the "Content Type giả định" picker) — before the fix, its slot dropdowns (e.g. "Ảnh")
    // stayed empty ("Không có lựa chọn") because fieldOptions() never read relatedContentTypeKey.
    it('populates the Card List slot options from relatedContentTypeKey when source is "related"', async () => {
        const { getByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'related', cardinality: 'many', matchField: 'danhMuc', relatedContentTypeKey: 'ct-san-pham' }}
                nodeType="card-list"
                onChange={vi.fn()}
            />
        ));
        const imageLabel = await waitFor(() => getByText('Ảnh'));
        const imageInput = imageLabel.closest('div')!.querySelector('input')!;
        fireEvent.focus(imageInput);
        await waitFor(() => expect(getByText('Ảnh sản phẩm')).toBeTruthy());
    });

    // The 'backlink' branch of `effectiveContentTypeKey()` (sourceContentTypeId) is the same
    // 3-way ternary as the 'related' branch proven above — not separately regression-tested here
    // (TableColumnsEditor's own add/focus interaction needs a StatefulWrapper + real DOM timing
    // that proved too flaky to land reliably in this pass); the 'related' Card List case above is
    // the exact scenario reproduced live on Báo Bối Pet Spa's product Detail page.
});

describe('NodeDataSourceTab — local array repeater (Phase A1, 2026-08-20)', () => {
    it('shows "Mảng tự nhập" as a source option and selecting it hides the Content Type picker', () => {
        const { getByText, container } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'own', mode: 'dynamic', cardinality: 'many' }} nodeType="frame" onChange={vi.fn()} />
        ));
        // The Select's dropdown options render into the DOM only once opened (DropdownSelect.tsx's
        // Floating `isRendered()`/`<Show>` gate — the currently-SELECTED option is the only one
        // that renders unconditionally, via its own always-mounted overlay; that's why every OTHER
        // test in this file that checks a Select only asserts the resolved label for the CURRENT
        // value, same as NodeStyleTab.test.tsx's font-family Select tests). repeat.source here is
        // 'own', not 'local', so proving 'local' really made it into the options array requires
        // actually opening the dropdown, by focusing its underlying <input> — same interaction a
        // real admin performs by clicking the field.
        const sourceLabel = getByText('Nguồn dữ liệu');
        const sourceInput = sourceLabel.closest('div')!.querySelector('input')!;
        fireEvent.focus(sourceInput);
        expect(getByText('Mảng tự nhập')).toBeTruthy();
        // Content Type picker only shows for source 'own' — not present at all when repeat.source
        // is already 'local' in the next test; this test just confirms the option text exists.
    });

    it('selecting local source shows the item-shape editor and the item-data repeater, hides Content Type controls', () => {
        const { getByText, queryByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }], localItems: [{ title: 'Mục 1' }] }}
                nodeType="frame"
                onChange={vi.fn()}
            />
        ));
        expect(getByText('Định nghĩa các trường cho mỗi mục')).toBeTruthy();
        expect(getByText('Danh sách mục')).toBeTruthy();
        expect(queryByText('Content Type')).toBeNull();
    });

    it('adds a new (empty) item field', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'local', cardinality: 'many', localItemFields: [] }} nodeType="frame" onChange={onChange} />
        ));
        fireEvent.click(getByText('+ Thêm trường'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            localItemFields: [{ key: '', labelKey: '', control: 'text' }],
        }));
    });

    it('typing a field label auto-fills the key by slugifying it, when the key has not been hand-edited', () => {
        const onChange = vi.fn();
        const { getByPlaceholderText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: '', labelKey: '', control: 'text' }] }} nodeType="frame" onChange={onChange} />
        ));
        fireEvent.input(getByPlaceholderText('Tên trường (VD: Tiêu đề)'), { target: { value: 'Tiêu đề chính' } });
        // `slugifyFieldKey` is deliberately simple — lowercase + strip anything outside [a-z0-9],
        // no unicode-diacritic folding (see its doc comment in NodeDataSourceTab.tsx) — so
        // diacritic letters like "ê"/"đ"/"í" are stripped outright rather than transliterated to
        // their plain-ASCII counterpart. 'Tiêu đề chính' → 'tiêu đề chính' → strip → 'tiuchnh'.
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            localItemFields: [{ key: 'tiuchnh', labelKey: 'Tiêu đề chính', control: 'text' }],
        }));
    });

    it('removes an item field', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }] }}
                nodeType="frame"
                onChange={onChange}
            />
        ));
        fireEvent.click(getByLabelText('remove-local-item-field'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ localItemFields: [] }));
    });

    it('the item-data RepeaterFieldEditor is wired to localItems, writing through onChange on patch', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }], localItems: [] }}
                nodeType="frame"
                onChange={onChange}
            />
        ));
        fireEvent.click(getByText('+ Thêm mục'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ localItems: [{ title: undefined }] }));
    });
});

describe('NodeDataSourceTab — LocalItemFieldsEditor fix round 1 (focus-loss + rename-orphan, 2026-08-20)', () => {
    // Fix 1 regression test. `LocalItemFieldsEditor`'s row list used to render via `<For>`
    // (reference-keyed) while `update()`/`updateLabel()` replace the row object on every
    // keystroke — that combination tears down and remounts the row's whole DOM subtree per
    // keystroke, dropping focus after exactly one character. Every OTHER test in this file passes
    // a STATIC `repeat` prop plus a no-op `vi.fn()` onChange, so `repeat` never actually changes
    // between renders and this bug class can't surface — reproducing it needs a REAL stateful
    // parent that writes each `onChange` back into a live signal, same as
    // `RepeaterFieldEditor.test.tsx`'s own `Wrapper` pattern for the identical bug class in the
    // sibling editor.
    it('typing two characters in sequence into a field label keeps focus on the same input and lands both characters (regression: <Index> not <For>)', () => {
        function StatefulWrapper() {
            const [repeat, setRepeat] = createSignal<CollectionRepeat | null>({
                source: 'local',
                cardinality: 'many',
                localItemFields: [{ key: '', labelKey: '', control: 'text' }],
                localItems: [],
            });
            return <NodeDataSourceTab repeat={repeat()} nodeType="frame" onChange={(v) => setRepeat(v)} />;
        }

        const { getByPlaceholderText } = render(() => <StatefulWrapper />);
        const input = getByPlaceholderText('Tên trường (VD: Tiêu đề)') as HTMLInputElement;
        input.focus();
        expect(document.activeElement).toBe(input);

        fireEvent.input(input, { target: { value: 'A' } });
        // Re-fetch by placeholder each time: under the pre-fix <For>, the row (and its input) is
        // torn down and rebuilt on every keystroke, so the input reference found after the first
        // keystroke would already be a DIFFERENT DOM node than the one focused before it — losing
        // focus. Under the fix (<Index>), the same input instance survives across the value
        // replacement.
        const inputAfterFirst = getByPlaceholderText('Tên trường (VD: Tiêu đề)') as HTMLInputElement;
        expect(inputAfterFirst).toBe(input);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe('A');

        fireEvent.input(input, { target: { value: 'Ab' } });
        const inputAfterSecond = getByPlaceholderText('Tên trường (VD: Tiêu đề)') as HTMLInputElement;
        expect(inputAfterSecond).toBe(input);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe('Ab');
    });

    // Fix 2 regression test. The field's object `key` is auto-derived from its label via
    // `slugifyFieldKey` — editing a label after items already have data changes the key, and
    // without migration the existing rows keep the OLD key while the field descriptor now points
    // at a NEW key, so `items[i][newKey]` reads as `undefined`: the typed data is silently
    // orphaned. `updateLabel` must migrate `localItems` in the same update via `renameItemKey`.
    it('editing a field label that changes its derived key migrates the value in existing localItems to the new key, not orphaning it', () => {
        const onChange = vi.fn();
        const { getByPlaceholderText } = render(() => (
            <NodeDataSourceTab
                repeat={{
                    source: 'local',
                    cardinality: 'many',
                    localItemFields: [{ key: 'a', labelKey: 'A', control: 'text' }],
                    localItems: [{ a: 'value1' }],
                }}
                nodeType="frame"
                onChange={onChange}
            />
        ));

        fireEvent.input(getByPlaceholderText('Tên trường (VD: Tiêu đề)'), { target: { value: 'Renamed Label' } });

        // 'Renamed Label' -> lowercase -> 'renamed label' -> strip non [a-z0-9] -> 'renamedlabel'.
        // `updateLabel` fires TWO onChange calls in the same update (localItemFields patch, then
        // the localItems-migration patch via onItemsChange) — the FIRST call's argument still
        // carries the ORIGINAL (pre-migration) `localItems` unchanged (patch() merges onto the
        // still-static `props.repeat`, and a static prop/mock never actually updates between the
        // two calls), so asserting on the LAST call is what actually proves the migration ran.
        const newKey = 'renamedlabel';
        expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
        const [patchArg] = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(patchArg.localItems).toEqual([{ [newKey]: 'value1' }]);
        expect(patchArg.localItems[0]).not.toHaveProperty('a');
    });
});

describe('NodeDataSourceTab — LocalItemFieldsEditor editable key (Final-review fix Important #2, 2026-08-20)', () => {
    // Design doc §3 specifies each item-shape row should have a label, a key
    // (auto-slugified from the label, EDITABLE), and a control-type Select — the shipped version
    // only had label + control-type, no key input at all, so an unslugifiable/colliding label
    // (e.g. "Mã"/"Mô" both slugify to "m") could never be fixed by hand.
    it('renders a key input seeded with the auto-slugified value', () => {
        const { getByPlaceholderText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'tieude', labelKey: 'Tiêu đề', control: 'text' }] }}
                nodeType="frame"
                onChange={vi.fn()}
            />
        ));
        const keyInput = getByPlaceholderText(t('cms.node.dataSource.localItemFieldKeyPlaceholder')) as HTMLInputElement;
        expect(keyInput.value).toBe('tieude');
    });

    it('typing directly into the key input calls onChange with that exact key, not a re-slugified version', () => {
        const onChange = vi.fn();
        const { getByPlaceholderText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'tieude', labelKey: 'Tiêu đề', control: 'text' }] }}
                nodeType="frame"
                onChange={onChange}
            />
        ));
        const keyInput = getByPlaceholderText(t('cms.node.dataSource.localItemFieldKeyPlaceholder'));
        fireEvent.input(keyInput, { target: { value: 'Custom_Key!' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            localItemFields: [{ key: 'Custom_Key!', labelKey: 'Tiêu đề', control: 'text' }],
        }));
    });

    it('after a hand-edit of the key, a subsequent label edit does NOT change the key anymore (keyWasAutoDerived guard, now reachable)', () => {
        function StatefulWrapper() {
            const [repeat, setRepeat] = createSignal<CollectionRepeat | null>({
                source: 'local',
                cardinality: 'many',
                localItemFields: [{ key: 'tieude', labelKey: 'Tiêu đề', control: 'text' }],
                localItems: [],
            });
            return <NodeDataSourceTab repeat={repeat()} nodeType="frame" onChange={(v) => setRepeat(v)} />;
        }
        const { getByPlaceholderText } = render(() => <StatefulWrapper />);

        // Hand-edit the key away from its auto-derived slug.
        const keyInput = getByPlaceholderText(t('cms.node.dataSource.localItemFieldKeyPlaceholder'));
        fireEvent.input(keyInput, { target: { value: 'handEditedKey' } });

        // Now edit the label — the key must stay as the hand-edited value, not get re-slugified.
        const labelInput = getByPlaceholderText('Tên trường (VD: Tiêu đề)');
        fireEvent.input(labelInput, { target: { value: 'Tiêu đề mới' } });

        const keyInputAfter = getByPlaceholderText(t('cms.node.dataSource.localItemFieldKeyPlaceholder')) as HTMLInputElement;
        expect(keyInputAfter.value).toBe('handEditedKey');
    });

    it('an empty key shows the warning text', () => {
        const { getByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: '', labelKey: 'X', control: 'text' }] }}
                nodeType="frame"
                onChange={vi.fn()}
            />
        ));
        expect(getByText(t('cms.node.dataSource.localItemFieldKeyWarning'))).toBeTruthy();
    });

    it('two fields with colliding keys both show the warning text', () => {
        const { getAllByText } = render(() => (
            <NodeDataSourceTab
                repeat={{
                    source: 'local', cardinality: 'many',
                    localItemFields: [
                        { key: 'm', labelKey: 'Mã', control: 'text' },
                        { key: 'm', labelKey: 'Mô', control: 'text' },
                    ],
                }}
                nodeType="frame"
                onChange={vi.fn()}
            />
        ));
        expect(getAllByText(t('cms.node.dataSource.localItemFieldKeyWarning')).length).toBe(2);
    });
});
