
import { Field, FieldProps } from "@core/components/form/Field";
import {
  Datatable as BaseDatatable,
  DatatableProps,
} from "@core/components/table/Datatable";
import { mergeClass } from "@core/helpers/class";
import { BaseService } from "@core/services/base.service";
import { Accessor, For, JSX, Show, createSignal, onMount, splitProps } from "solid-js";
import { CreateDataProps } from "../../api/createData";
import { Fieldset, FieldsetProps } from "../form/FieldSet";
import { Cell, CellProps } from "./Cell";
import { CellButton, CellButtonProps } from "./CellButton";
import { CellButtonDelete, CellButtonDeleteProps } from "./CellButtonDelete";
import { CellButtonUpdate, CellButtonUpdateProps } from "./CellButtonUpdate";
import { CellButtonView, CellButtonViewProps } from "./CellButtonView";
import { DatatableButton, DatatableButtonProps } from "./DatatableButton";
import { DatatableButtonCreate, DatatableButtonCreateProps } from "./DatatableButtonCreate";
import { DatatableButtonRefresh, DatatableButtonRefreshProps } from "./DatatableButtonRefresh";
import { useDatatable } from "./DatatableContext";
import { DatatableFilter, DatatableFilterProps } from "./DatatableFilter";
import { DatatableSideFilter, DatatableSideFilterProps } from "./DatatableSideFilter";
import { DatatableFormlog, DatatableFormlogProps } from "./DatatableFormlog";
import { DatatablePagination, DatatablePaginationProps } from "./DatatablePagination";
import { DatatableSearch, DatatableSearchProps } from "./DatatableSearch";
import { DatatableSelection, DatatableSelectionProps } from "./DatatableSelection";
import { DatatableTitle, DatatableTitleProps } from "./DatatableTitle";
import { Table, TableProps } from "./Table";
import { TableColumn, TableColumnProps } from "./TableColumn";
import { useIsAgencyView } from "@/shared/hooks/useIsAgencyView";
import { AgencyTenantCell } from "@/shared/components/agency/AgencyTenantCell";
import { AgencyTenantFilterField } from "@/shared/components/agency/AgencyTenantFilterField";
import { AgencyTenantFormField } from "@/shared/components/agency/AgencyTenantFormField";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PagingArgsInput = {
  after?: string;
  before?: string;
  filter?: any;
  limit?: number;
  page?: number;
  search?: string;
  searchFields?: Array<string>;
  sort?: any | null;
};

export type GeneratedDatatable<
  QueryInput extends PagingArgsInput,
  ListItemType extends object,
  TransformedItemType,
  ItemType,
  FormValuesCreate extends object,
  FormValuesUpdate extends object,
> = {
  Datatable: {
    (
      props: Omit<
        DatatableProps<QueryInput, ListItemType>,
        "paginatedQuery" | "service"
      >,
    ): JSX.Element;

    Header(props: BaseProps): JSX.Element;
    Title: (props: DatatableTitleProps) => JSX.Element;
    Buttons(props: BaseProps): JSX.Element;
    Button: (props: DatatableButtonProps) => JSX.Element;
    ButtonCreate: (props: DatatableButtonCreateProps) => JSX.Element;
    ButtonRefresh: (props: DatatableButtonRefreshProps) => JSX.Element;
    Toolbar(props: BaseProps): JSX.Element;
    Search: (props: DatatableSearchProps) => JSX.Element;
    Filter: (props: DatatableFilterProps) => JSX.Element;
    FilterField: (props: FieldProps<ListItemType>) => JSX.Element;
    SideFilter: (props: DatatableSideFilterProps) => JSX.Element;
    Fieldset: (props: FieldsetProps) => JSX.Element;

    // Table: signature goc, khong thay doi
    Table(props: TableProps<TransformedItemType>): JSX.Element;
    Column: (props: TableColumnProps<TransformedItemType>) => JSX.Element;

    // Parase 2 — Agency: cot/loc/chon "To chuc" (tu an o giao dien Tenant)
    TenantColumn: (props?: {
      title?: string;
      accessor?: (item: TransformedItemType) => { id?: string | null; name?: string | null; code?: string | null } | null | undefined;
    }) => JSX.Element;
    TenantFilter: (props?: { label?: string }) => JSX.Element;
    TenantField: (props?: { label?: string }) => JSX.Element;

    // NEW: dev tu viet card layout (opt-in)
    CardView: (props: {
      children: (item: TransformedItemType, index: Accessor<number>) => JSX.Element;
      class?: string;
    }) => JSX.Element;

    Cell: (props: CellProps) => JSX.Element;
    CellButtons(props: BaseProps): JSX.Element;
    CellButton: (props: CellButtonProps) => JSX.Element;
    CellButtonUpdate: (
      props: Omit<CellButtonUpdateProps<ListItemType, ItemType>, "itemQuery">,
    ) => JSX.Element;
    CellButtonView: (
      props: Omit<CellButtonViewProps<ListItemType, ItemType>, "itemQuery">,
    ) => JSX.Element;
    CellButtonDelete: (
      props: Omit<CellButtonDeleteProps<ListItemType>, "deleteMutation">,
    ) => JSX.Element;
    Pagination: (props: DatatablePaginationProps) => JSX.Element;
    Selection: (props: DatatableSelectionProps<ListItemType>) => JSX.Element;
    Formlog: (
      props: Omit<
        DatatableFormlogProps<ItemType, FormValuesCreate, FormValuesUpdate>,
        "createMutation" | "updateMutation"
      >,
    ) => JSX.Element;
    Field: (props: FieldProps<FormValuesCreate & FormValuesUpdate>) => JSX.Element;
  };
};

export type GenerateDatatable<
  QueryInput extends PagingArgsInput,
  ListItemType,
  TransformedItemType extends ListItemType,
  ItemType,
  FormValuesCreate,
  FormValuesUpdate,
> = {
  service: typeof BaseService;
  itemQuery?: (item: ListItemType) => Promise<ItemType | null | undefined>;
  createMutation?: (data: FormValuesCreate) => Promise<ItemType | null | undefined>;
  updateMutation?: (id: string, data: FormValuesUpdate) => Promise<ItemType | null | undefined>;
  deleteMutation?: (item: ListItemType) => Promise<any>;
} & CreateDataProps<QueryInput, ListItemType, TransformedItemType>;

// ─────────────────────────────────────────────────────────────────────────────
// generateDatatable
// ─────────────────────────────────────────────────────────────────────────────

export function generateDatatable<
  QueryInput extends PagingArgsInput,
  ListItemType extends object,
  TransformedItemType extends ListItemType,
  ItemType,
  FormValuesCreate extends object,
  FormValuesUpdate extends object,
>({
  service,
  paginatedQuery,
  queryInput,
  itemQuery,
  createMutation,
  updateMutation,
  deleteMutation,
  ...generatedDatatableProps
}: GenerateDatatable<
  QueryInput,
  ListItemType,
  TransformedItemType,
  ItemType,
  FormValuesCreate,
  FormValuesUpdate
>): GeneratedDatatable<
  QueryInput,
  ListItemType,
  TransformedItemType,
  ItemType,
  FormValuesCreate,
  FormValuesUpdate
> & {
  triggerRefresh: () => any;
} {
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);
  const triggerRefresh = () => setRefreshTrigger((t) => t + 1);

  // ── Root Datatable component ──────────────────────────────────────────────
  const Datatable = (
    props: Omit<
      DatatableProps<QueryInput, ListItemType, TransformedItemType>,
      "paginatedQuery" | "service"
    >,
  ) => {
    const [childrenProps, datatableProps] = splitProps(props, ["children"]);
    return (
      <BaseDatatable
        {...generatedDatatableProps}
        {...datatableProps}
        service={service}
        paginatedQuery={paginatedQuery}
        defaultQueryInput={queryInput}
        refreshTrigger={refreshTrigger()}
      >
        {childrenProps.children}
      </BaseDatatable>
    );
  };

  // ── Header: flex-col tren mobile ─────────────────────────────────────────
  Datatable.Header = (props: BaseProps) => {
    const { isMobile } = useDatatable();
    return (
      <div
        class={mergeClass(
          "flex items-start justify-between",
          isMobile() && "flex-col gap-2",
          props.class,
        )}
      >
        {props.children}
      </div>
    );
  };

  Datatable.Title = DatatableTitle;

  // ── Buttons: full-width + wrap tren mobile ────────────────────────────────
  Datatable.Buttons = (props: BaseProps) => {
    const { isMobile } = useDatatable();
    return (
      <div
        class={mergeClass(
          "flex gap-1",
          isMobile() ? "w-full justify-end flex-wrap" : "justify-end",
          props.class,
        )}
      >
        {props.children}
      </div>
    );
  };

  Datatable.Button = DatatableButton;
  Datatable.ButtonCreate = DatatableButtonCreate;
  Datatable.ButtonRefresh = DatatableButtonRefresh;

  // ── Toolbar: flex-col tren mobile ────────────────────────────────────────
  Datatable.Toolbar = (props: BaseProps) => {
    const { isMobile } = useDatatable();
    return (
      <div
        class={mergeClass(
          "flex items-start justify-between gap-2",
          isMobile() && "flex-col",
          props.class,
        )}
      >
        {props.children}
      </div>
    );
  };

  Datatable.Search = DatatableSearch;
  Datatable.Filter = DatatableFilter;
  Datatable.SideFilter = DatatableSideFilter;
  Datatable.FilterField = Field<ListItemType>;
  Datatable.Fieldset = Fieldset;
  Datatable.Selection = DatatableSelection;

  // ── CardView: opt-in custom card layout ──────────────────────────────────
  //
  // Usage (ben trong <Datatable>):
  //
  //   <Datatable.CardView>
  //     {(item) => (
  //       <div class="rounded-xl border p-4">
  //         <p class="font-bold">{item.name}</p>
  //         <p>{item.status}</p>
  //         <Datatable.CellButtonDelete item={item} itemName={item.name} />
  //       </div>
  //     )}
  //   </Datatable.CardView>
  //
  // - Tren desktop: khong render gi (Table render binh thuong)
  // - Tren mobile: hien thi list card theo children
  // - Khi co CardView: MobileCardList (auto) se KHONG duoc dung
  //
  Datatable.CardView = (props: {
    children: (item: TransformedItemType, index: Accessor<number>) => JSX.Element;
    class?: string;
  }) => {
    const { setCardViewChildren, isMobile, items, loading } = useDatatable();

    // Dang ky render fn vao context de Datatable.Table biet co CardView
    onMount(() => {
      setCardViewChildren(() => props.children as any);
    });

    // Chi render tren mobile
    return (
      <Show when={isMobile()}>
        <div class={mergeClass("flex flex-col gap-3", props.class)}>
          <Show
            when={!loading()}
            fallback={
              <For each={Array(3).fill(null)}>
                {() => (
                  <div class="rounded-xl border border-neutral-200 bg-white p-4 animate-pulse space-y-3">
                    <div class="h-4 bg-neutral-100 rounded w-2/3" />
                    <div class="h-3 bg-neutral-100 rounded w-1/2" />
                    <div class="h-3 bg-neutral-100 rounded w-3/4" />
                  </div>
                )}
              </For>
            }
          >
            <For each={items() as TransformedItemType[]}>
              {(item, index) => props.children(item, index)}
            </For>
          </Show>
        </div>
      </Show>
    );
  };

  // ── Table ─────────────────────────────────────────────────────────────────
  //
  // Thay doi duy nhat so voi ban goc: them bien hideTable.
  //
  //   KHONG co CardView  →  cardViewChildren() = undefined
  //                      →  !!undefined = false  →  hideTable luon = false
  //                      →  Table hien BINH THUONG moi breakpoint
  //                      →  Tren mobile: scroll ngang, KHONG co card trang
  //
  //   CO CardView        →  sau onMount: cardViewChildren() = render fn
  //                      →  Desktop: isMobile()=false → hideTable=false → Table hien
  //                      →  Mobile:  isMobile()=true  → hideTable=true  → Table an
  //
  Datatable.Table = (props: TableProps<TransformedItemType>) => {
    const {
      items,
      setOrder,
      loading,
      selectable,
      selectedItems,
      setSelectedItems,
      isMobile,
      cardViewChildren,
    } = useDatatable();

    const hideTable = () => isMobile() && !!cardViewChildren();

    return (
      <Show when={!hideTable()}>
        <Table<TransformedItemType>
          items={items()}
          tableStyle="open"
          loading={loading()}
          {...props}
          selectable={selectable()}
          selectedItems={selectedItems()}
          onSelectedItemsChange={(its) => setSelectedItems(its)}
          onOrder={(order) => setOrder(order)}
        >
          {props.children}
        </Table>
      </Show>
    );
  };

  Datatable.Column = TableColumn<TransformedItemType>;

  // ── Parase 2 — Agency primitives (tu an o giao dien Tenant) ───────────────
  //
  // <Datatable.TenantColumn />  — cot "To chuc" trong bang, dat trong <Datatable.Table>
  // <Datatable.TenantFilter />  — loc theo to chuc, dat trong <Datatable.Filter>
  // <Datatable.TenantField />   — chon to chuc dich khi tao, dat trong <Datatable.Formlog>
  //
  // Mac dinh doc item.tenant ({ id, name, code }) — service nho them i.tenant(t=>[t.id,t.name,t.code]).
  Datatable.TenantColumn = (props?: {
    title?: string;
    accessor?: (item: TransformedItemType) => { id?: string | null; name?: string | null; code?: string | null } | null | undefined;
  }) => {
    const isAgency = useIsAgencyView();
    return (
      <Show when={isAgency()}>
        {TableColumn<TransformedItemType>({
          title: props?.title ?? "Tổ chức",
          fitContent: true,
          children: (item: TransformedItemType) => {
            const tenant = props?.accessor ? props.accessor(item) : (item as any)?.tenant;
            return <AgencyTenantCell tenant={tenant} tenantId={(item as any)?.tenantId} />;
          },
        })}
      </Show>
    );
  };

  Datatable.TenantFilter = (props?: { label?: string }) => {
    const isAgency = useIsAgencyView();
    return (
      <Show when={isAgency()}>
        <AgencyTenantFilterField label={props?.label} />
      </Show>
    );
  };

  Datatable.TenantField = (props?: { label?: string }) => {
    const isAgency = useIsAgencyView();
    return (
      <Show when={isAgency()}>
        <AgencyTenantFormField label={props?.label} />
      </Show>
    );
  };

  Datatable.Cell = Cell;

  Datatable.CellButtons = (props: BaseProps) => (
    <div class={mergeClass("-mr-2 flex justify-end gap-1", props.class)}>
      {props.children}
    </div>
  );

  Datatable.CellButton = CellButton;

  Datatable.CellButtonUpdate = (
    props: Omit<CellButtonUpdateProps<ListItemType, ItemType>, "itemQuery">,
  ) => <CellButtonUpdate {...(props as any)} itemQuery={itemQuery} />;

  Datatable.CellButtonView = (
    props: Omit<CellButtonViewProps<ListItemType, ItemType>, "itemQuery">,
  ) => <CellButtonView {...(props as any)} itemQuery={itemQuery} />;

  Datatable.CellButtonDelete = (
    props: Omit<CellButtonDeleteProps<ListItemType>, "deleteMutation">,
  ) => <CellButtonDelete {...(props as any)} deleteMutation={deleteMutation} />;

  Datatable.Pagination = DatatablePagination;

  // ── Formlog: responsive width + viewMode ──────────────────────────────────
  //
  // Tren mobile:
  //   - Width class (w-[1200px], max-w-[800px]) bi override thanh w-full
  //   - viewMode="modal" chuyen thanh "drawer" (slide tu duoi len, tu nhien hon)
  //   - viewMode="modal" giu nguyen
  //
  Datatable.Formlog = (
    props: Omit<
      DatatableFormlogProps<ItemType, FormValuesCreate, FormValuesUpdate>,
      "createMutation" | "updateMutation"
    >,
  ) => {
    const { isMobile } = useDatatable();

    // Strip width constraints khi tren mobile, de form chiem toan man hinh
    const resolvedClass = () => {
      if (!isMobile()) return props.class;
      const stripped = (props.class ?? "")
        .split(" ")
        .filter((cls) => !cls.startsWith("w-[") && !cls.startsWith("max-w-["))
        .join(" ");
      return mergeClass("w-full", stripped);
    };

    // Modal tren mobile cam giac khong tu nhien, doi sang drawer
    const resolvedViewMode = () =>
      isMobile() && props.viewMode === "modal" ? "drawer" : props.viewMode;

    return (
      <DatatableFormlog<ItemType, FormValuesCreate, FormValuesUpdate>
        {...props}
        class={resolvedClass()}
        viewMode={resolvedViewMode()}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />
    );
  };

  Datatable.Field = Field<FormValuesCreate & FormValuesUpdate>;

  return { Datatable, triggerRefresh };
}