// ddd-graphql-fe/src/core/components/table/GeneratedDatatable.test.tsx
// @vitest-environment jsdom
//
// Regression test for Datatable.CardView's empty-state fallback (Admin UI
// Polish, Task 8). Before the fix, an empty `items` list on mobile rendered
// NOTHING at all inside <Datatable.CardView> — no icon, no text, just blank
// space — because the item-rendering <For> had no empty-state branch. The fix
// wraps that <For> in <Show when={items()?.length} fallback={<Empty />}>,
// matching what Table.tsx already does for the desktop/table path.
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { JSX } from 'solid-js';
import { generateDatatable } from './GeneratedDatatable';
import { DatatableContext, DatatableContextValue } from './DatatableContext';
import { SearchQueryInput } from './Datatable';
import { BaseService } from '@core/services/base.service';
import { createSignal } from 'solid-js';

// Minimal concrete subclass — generateDatatable() only needs a `typeof
// BaseService` reference to build the root <Datatable>, which this test never
// renders (only <Datatable.CardView>, which never touches `service`).
class FakeService extends BaseService {}

function buildContext(opts: {
  items?: any[];
  loading?: boolean;
  isMobile?: boolean;
}): DatatableContextValue {
  const [items] = createSignal<any[] | undefined>(opts.items);
  const [loading] = createSignal<boolean>(opts.loading ?? false);
  const [loaded] = createSignal<boolean>(true);
  const [totalCount] = createSignal<number>(opts.items?.length ?? 0);
  const [limit, setLimit] = createSignal<number>(10);
  const [page, setPage] = createSignal<number>(1);
  const [search, setSearch] = createSignal<SearchQueryInput | undefined>(undefined);
  const [isFormlogOpen, setIsFormlogOpenSig] = createSignal<boolean | MouseEvent | undefined>(
    false,
  );
  const [formlogItem, setFormlogItemSig] = createSignal<any>(undefined);
  const [isFormlogReadOnly, setIsFormlogReadOnly] = createSignal<boolean>(false);
  const [selectable] = createSignal<boolean>(false);
  const [selectedItems, setSelectedItemsSig] = createSignal<{ [id: string]: any }>({});
  const [isMobile] = createSignal<boolean>(opts.isMobile ?? false);
  const [isCompact] = createSignal<boolean>(opts.isMobile ?? false);
  const [cardViewChildren, setCardViewChildren] = createSignal<
    ((item: any, index: () => number) => JSX.Element) | undefined
  >(undefined);

  return {
    id: 'test-datatable',
    service: FakeService,
    items,
    refresh: () => {},
    loaded,
    loading,
    totalCount,
    limit,
    changeLimit: (l: number) => setLimit(l),
    page,
    changePage: (p: number) => setPage(p),
    search,
    setSearch,
    setFilter: (() => {}) as any,
    setSideFilter: (() => {}) as any,
    setOrder: () => {},
    isFormlogOpen,
    setIsFormlogOpen: (val?: boolean | MouseEvent) => setIsFormlogOpenSig(val),
    formlogItem,
    setFormlogItem: (val?: any) => setFormlogItemSig(val),
    isFormlogReadOnly,
    setIsFormlogReadOnly,
    selectable,
    selectedItems,
    setSelectedItems: (its: { [id: string]: any }) => setSelectedItemsSig(its),
    isMobile,
    isCompact,
    cardViewChildren,
    setCardViewChildren,
  };
}

describe("Datatable.CardView empty-state fallback (Admin UI Polish, Task 8)", () => {
  const { Datatable } = generateDatatable<any, any, any, any, any, any>({
    service: FakeService,
    paginatedQuery: async () => null,
  });

  it('renders the shared <Empty /> fallback when items is an empty array and not loading, on mobile', () => {
    const ctx = buildContext({ items: [], loading: false, isMobile: true });

    const { container, getByText } = render(() => (
      <DatatableContext.Provider value={ctx}>
        <Datatable.CardView>{(item: any) => <div class="card">{item.name}</div>}</Datatable.CardView>
      </DatatableContext.Provider>
    ));

    // Empty's default text (BaseTextConfig.emptyText) actually rendered — proving
    // something is shown, not just "not blank".
    expect(getByText('Không tìm thấy dữ liệu')).toBeTruthy();
    // No item cards, no skeleton placeholders.
    expect(container.querySelectorAll('.card').length).toBe(0);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
  });

  it('renders the item template for each entry when items has entries (non-empty path unaffected by the fix)', () => {
    const ctx = buildContext({
      items: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }],
      loading: false,
      isMobile: true,
    });

    const { container, queryByText } = render(() => (
      <DatatableContext.Provider value={ctx}>
        <Datatable.CardView>{(item: any) => <div class="card">{item.name}</div>}</Datatable.CardView>
      </DatatableContext.Provider>
    ));

    expect(container.querySelectorAll('.card').length).toBe(2);
    expect(queryByText('Alpha')).toBeTruthy();
    expect(queryByText('Beta')).toBeTruthy();
    // Empty fallback must NOT render alongside real items.
    expect(queryByText('Không tìm thấy dữ liệu')).toBeFalsy();
  });

  it('renders the loading skeleton (not the empty fallback) when loading is true, even with an empty items list', () => {
    const ctx = buildContext({ items: [], loading: true, isMobile: true });

    const { container, queryByText } = render(() => (
      <DatatableContext.Provider value={ctx}>
        <Datatable.CardView>{(item: any) => <div class="card">{item.name}</div>}</Datatable.CardView>
      </DatatableContext.Provider>
    ));

    // Loading skeleton (3 pulsing placeholder rows) shows instead of <Empty />.
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
    expect(queryByText('Không tìm thấy dữ liệu')).toBeFalsy();
    expect(container.querySelectorAll('.card').length).toBe(0);
  });

  it('renders nothing on desktop (isMobile false), regardless of items', () => {
    const ctx = buildContext({ items: [], loading: false, isMobile: false });

    const { container } = render(() => (
      <DatatableContext.Provider value={ctx}>
        <Datatable.CardView>{(item: any) => <div class="card">{item.name}</div>}</Datatable.CardView>
      </DatatableContext.Provider>
    ));

    expect(container.textContent).toBe('');
  });
});
