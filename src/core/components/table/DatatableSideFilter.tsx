// @core/components/table/DatatableSideFilter.tsx
//
// Faceted side filter cho DataTable.
// Usage:
//
//   <Datatable.SideFilter
//     filters={[
//       { field: 'status', label: 'Trạng thái', type: 'checkbox', options: STATUS_OPTIONS },
//       { field: 'area',   label: 'Diện tích',  type: 'range', min: 0, max: 1000, unit: 'ha' },
//       { field: 'createdAt', label: 'Ngày tạo', type: 'date-range' },
//     ]}
//   >
//     <Datatable.Table>...</Datatable.Table>
//     <Datatable.Pagination />
//   </Datatable.SideFilter>
//
// - Desktop: sidebar trái/phải, có thể collapse.
// - Mobile/tablet: nút toggle → expandable panel phía trên nội dung.
// - Tự động merge filter vào context qua `setSideFilter` (không ảnh hưởng DatatableFilter).
//
// Operator mặc định theo type:
//   checkbox / checkbox-api  → $in  (multi-value OR trong 1 field)
//   single / boolean         → $eq
//   range min                → $gte
//   range max                → $lte
//   date-range min           → $gte
//   date-range max           → $lte
//
// Ví dụ override operator:
//   { field: 'status', type: 'checkbox', operator: EFilterOperator.NOT_IN, ... }
//   { field: 'area',   type: 'range',    operator: EFilterOperator.BETWEEN, ... }
//   { field: 'area',   type: 'range',    minOperator: EFilterOperator.GREATER_THAN, ... }
//   { field: 'name',   type: 'single',   operator: EFilterOperator.ILIKE, ... }

import { debounce } from '@solid-primitives/scheduled';
import { mergeClass } from '@core/helpers/class';
import {
  Accessor,
  For,
  JSX,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from 'solid-js';
import { EFilterOperator, FilterQueryInput } from '@core/api/types';
import { useDatatable } from './DatatableContext';
import { Input } from '../control/Input';
import { Select } from '../control/Select';

export { EFilterOperator };

// ─── Public types ─────────────────────────────────────────────────────────────

export type SideFilterType =
  | 'checkbox'      // Danh sách checkbox (options tĩnh)                         → $in
  | 'checkbox-api'  // Danh sách checkbox (load từ API)                          → $in
  | 'multi-select'  // Dropdown multi-select có search (tĩnh hoặc API, tối ưu cho list dài) → $in
  | 'single'        // Radio list (options tĩnh)                                 → $eq
  | 'range'         // Min/max số                                                → $gte / $lte
  | 'date-range'    // Min/max ngày                                              → $gte / $lte
  | 'boolean';      // true/false                                                → $eq

export interface SideFilterOption {
  label: string;
  value: any;
  /** Số lượng kết quả (tuỳ chọn, để hiển thị badge count) */
  count?: number;
}

export interface SideFilterConfig {
  /** Tên field trong FilterQueryInput */
  field: string;
  /** Nhãn hiển thị của nhóm filter */
  label: string;
  type: SideFilterType;
  /** Danh sách tuỳ chọn cho 'checkbox' / 'single' */
  options?: SideFilterOption[];
  /** Giá trị min cho 'range' */
  min?: number;
  /** Giá trị max cho 'range' */
  max?: number;
  /** Bước nhảy cho 'range' (default: 1) */
  step?: number;
  /** Nhãn đơn vị cho 'range', ví dụ: "ha", "kg" */
  unit?: string;
  /** Mặc định expanded. Default: true */
  defaultExpanded?: boolean;
  /** Hiện ô tìm kiếm trong danh sách option khi list quá dài */
  searchable?: boolean;
  /**
   * Giá trị được chọn sẵn khi khởi tạo.
   * - checkbox / checkbox-api: any[]  → pre-select nhiều item
   * - single / boolean: any           → pre-select 1 item
   * - range: { min?, max? }
   * - date-range: { min?, max? }
   */
  defaultValue?: any;
  /**
   * Cho type 'checkbox-api': load options từ API.
   * Cùng signature với Select.optionsQuery trong project.
   */
  optionsQuery?: {
    query: (input: { input: any }) => Promise<any>;
    option: (item: any) => SideFilterOption;
  };

  // ── Operator config ──────────────────────────────────────────────────────────
  /**
   * Operator áp dụng khi build FilterQueryInput.
   *
   * checkbox / checkbox-api:
   *   - Default: IN ($in) — các giá trị OR nhau trong 1 field
   *   - NOT_IN ($nin)     — loại trừ các giá trị đã chọn
   *
   * single / boolean:
   *   - Default: EQUALS ($eq)
   *   - NOT_EQUALS ($ne), IS_NULL ($null), NOT_NULL ($notNull)
   *
   * range / date-range:
   *   - Dùng minOperator / maxOperator thay vì operator
   *   - BETWEEN ($between): khi set, tạo { $between: [min, max] } (cần cả 2 đầu)
   */
  operator?: EFilterOperator;

  /**
   * Cho 'range' / 'date-range': operator áp cho giá trị bên trái (min).
   * Default: GREATER_THAN_OR_EQUAL ($gte)
   * Có thể đổi sang GREATER_THAN ($gt) để loại trừ mốc biên.
   */
  minOperator?: EFilterOperator;

  /**
   * Cho 'range' / 'date-range': operator áp cho giá trị bên phải (max).
   * Default: LESS_THAN_OR_EQUAL ($lte)
   * Có thể đổi sang LESS_THAN ($lt) để loại trừ mốc biên.
   */
  maxOperator?: EFilterOperator;
}

export interface DatatableSideFilterProps {
  filters: SideFilterConfig[];
  /** Mặc định mở sidebar. Default: true */
  defaultOpen?: boolean;
  /** Vị trí sidebar. Default: 'left' */
  position?: 'left' | 'right';
  class?: string;
  /** Nội dung nằm cạnh sidebar (Table, CardView, Pagination, ...) */
  children?: JSX.Element;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type RangeValue = { min?: number | null; max?: number | null };
type DateRangeValue = { min?: string | null; max?: string | null };
type ActiveFilterEntry =
  | { type: 'checkbox' | 'checkbox-api' | 'multi-select'; value: any[] }
  | { type: 'single' | 'boolean'; value: any }
  | { type: 'range'; value: RangeValue }
  | { type: 'date-range'; value: DateRangeValue };

type ActiveFilters = Record<string, ActiveFilterEntry>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryFilter(
  active: ActiveFilters,
  configs: SideFilterConfig[],
): FilterQueryInput {
  // Lookup nhanh theo field name
  const cfgMap = new Map(configs.map(c => [c.field, c]));
  const result: FilterQueryInput = {};

  for (const [field, entry] of Object.entries(active)) {
    const cfg = cfgMap.get(field);

    // ── checkbox / checkbox-api ──────────────────────────────────────────────
    if (entry.type === 'checkbox' || entry.type === 'checkbox-api' || entry.type === 'multi-select') {
      if (!entry.value.length) continue;
      const op = cfg?.operator ?? EFilterOperator.IN;

      if (op === EFilterOperator.IN && entry.value.length === 1) {
        // 1 giá trị + IN → dùng EQ cho query gọn hơn
        result[field] = { [EFilterOperator.EQUALS]: entry.value[0] };
      } else if (op === EFilterOperator.NOT_IN && entry.value.length === 1) {
        result[field] = { [EFilterOperator.NOT_EQUALS]: entry.value[0] };
      } else {
        result[field] = { [op]: entry.value };
      }

      // ── single / boolean ─────────────────────────────────────────────────────
    } else if (entry.type === 'single' || entry.type === 'boolean') {
      if (entry.value === null || entry.value === undefined) continue;
      const op = cfg?.operator ?? EFilterOperator.EQUALS;

      // IS_NULL / NOT_NULL: value không quan trọng, chỉ cần flag true
      if (op === EFilterOperator.IS_NULL || op === EFilterOperator.NOT_NULL) {
        result[field] = { [op]: true };
      } else {
        result[field] = { [op]: entry.value };
      }

      // ── range ────────────────────────────────────────────────────────────────
    } else if (entry.type === 'range') {
      const hasMin = entry.value.min !== null && entry.value.min !== undefined;
      const hasMax = entry.value.max !== null && entry.value.max !== undefined;
      if (!hasMin && !hasMax) continue;

      // BETWEEN → { $between: [min, max] } — chỉ khi đủ cả 2 đầu
      if (cfg?.operator === EFilterOperator.BETWEEN && hasMin && hasMax) {
        result[field] = { [EFilterOperator.BETWEEN]: [entry.value.min, entry.value.max] };
      } else {
        const f: any = {};
        const minOp = cfg?.minOperator ?? EFilterOperator.GREATER_THAN_OR_EQUAL;
        const maxOp = cfg?.maxOperator ?? EFilterOperator.LESS_THAN_OR_EQUAL;
        if (hasMin) f[minOp] = entry.value.min;
        if (hasMax) f[maxOp] = entry.value.max;
        result[field] = f;
      }

      // ── date-range ───────────────────────────────────────────────────────────
    } else if (entry.type === 'date-range') {
      const hasMin = !!entry.value.min;
      const hasMax = !!entry.value.max;
      if (!hasMin && !hasMax) continue;

      if (cfg?.operator === EFilterOperator.BETWEEN && hasMin && hasMax) {
        result[field] = { [EFilterOperator.BETWEEN]: [entry.value.min, entry.value.max] };
      } else {
        const f: any = {};
        const minOp = cfg?.minOperator ?? EFilterOperator.GREATER_THAN_OR_EQUAL;
        const maxOp = cfg?.maxOperator ?? EFilterOperator.LESS_THAN_OR_EQUAL;
        if (hasMin) f[minOp] = entry.value.min;
        if (hasMax) f[maxOp] = entry.value.max;
        result[field] = f;
      }
    }
  }

  return result;
}

function buildInitialActive(filters: SideFilterConfig[]): ActiveFilters {
  const init: ActiveFilters = {};
  for (const cfg of filters) {
    if (cfg.defaultValue === undefined || cfg.defaultValue === null) continue;
    const t = cfg.type;
    if (t === 'checkbox' || t === 'checkbox-api' || t === 'multi-select') {
      const arr = Array.isArray(cfg.defaultValue) ? cfg.defaultValue : [cfg.defaultValue];
      if (arr.length) init[cfg.field] = { type: t, value: arr };
    } else if (t === 'single' || t === 'boolean') {
      init[cfg.field] = { type: t, value: cfg.defaultValue };
    } else if (t === 'range') {
      init[cfg.field] = { type: 'range', value: cfg.defaultValue };
    } else if (t === 'date-range') {
      init[cfg.field] = { type: 'date-range', value: cfg.defaultValue };
    }
  }
  return init;
}

function countActive(active: ActiveFilters): number {
  let n = 0;
  for (const entry of Object.values(active)) {
    if ((entry.type === 'checkbox' || entry.type === 'checkbox-api' || entry.type === 'multi-select') && entry.value.length > 0) n++;
    else if ((entry.type === 'single' || entry.type === 'boolean') &&
      entry.value !== null && entry.value !== undefined) n++;
    else if (entry.type === 'range') {
      const { min, max } = entry.value;
      if ((min !== null && min !== undefined) || (max !== null && max !== undefined)) n++;
    } else if (entry.type === 'date-range') {
      if (entry.value.min || entry.value.max) n++;
    }
  }
  return n;
}

// ─── Icons (inline SVG, không thêm dependency) ────────────────────────────────

const IconFilter = () => (
  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
    stroke="currentColor" stroke-width={2}>
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
);

const IconChevronDown = (p: { class?: string }) => (
  <svg class={mergeClass('w-3.5 h-3.5 transition-transform', p.class)} fill="none"
    viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const IconChevronLeft = (p: { class?: string }) => (
  <svg class={mergeClass('w-3.5 h-3.5 transition-transform', p.class)} fill="none"
    viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup(props: {
  label: string;
  defaultExpanded?: boolean;
  hasActive: boolean;
  children: JSX.Element;
}) {
  const [open, setOpen] = createSignal(props.defaultExpanded !== false);
  return (
    <div class="border-b border-neutral-100 last:border-b-0">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-2.5
               text-xs font-semibold uppercase tracking-wide
               text-gray-500 hover:text-gray-700 hover:bg-neutral-50
               transition-colors select-none"
        onClick={() => setOpen(v => !v)}
      >
        <span class="flex items-center gap-2">
          <span>{props.label}</span>
          <Show when={props.hasActive}>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          </Show>
        </span>
        <IconChevronDown class={mergeClass('text-gray-400', open() ? 'rotate-180' : '')} />
      </button>
      <Show when={open()}>
        <div class="px-3 pb-3">{props.children}</div>
      </Show>
    </div>
  );
}

// ─── CheckboxFilter ───────────────────────────────────────────────────────────

function CheckboxFilter(props: {
  config: SideFilterConfig;
  selected: Accessor<any[]>;
  onToggle: (value: any) => void;
}) {
  const [q, setQ] = createSignal('');
  const showSearch = () =>
    !!props.config.searchable && (props.config.options?.length ?? 0) > 6;
  const visible = createMemo(() => {
    const s = q().toLowerCase();
    if (!s) return props.config.options ?? [];
    return (props.config.options ?? []).filter(o =>
      String(o.label).toLowerCase().includes(s)
    );
  });

  return (
    <div class="flex flex-col gap-0.5">
      <Show when={showSearch()}>
        <Input
          class="mb-2 h-8 text-sm"
          placeholder="Tìm kiếm..."
          clearable
          onChange={v => setQ(v || '')}
        />
      </Show>
      <For each={visible()}>
        {(opt) => {
          const checked = () => props.selected().includes(opt.value);
          return (
            <label class="flex items-center gap-2.5 cursor-pointer group
                          py-1 rounded hover:bg-neutral-50 -mx-1 px-1">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                checked={checked()}
                onChange={() => props.onToggle(opt.value)}
              />
              <span class={mergeClass(
                'text-sm flex-1 leading-tight truncate',
                checked() ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900',
              )}>
                {opt.label}
              </span>
              <Show when={opt.count !== undefined}>
                <span class="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {opt.count}
                </span>
              </Show>
            </label>
          );
        }}
      </For>
    </div>
  );
}

// ─── CheckboxApiFilter ────────────────────────────────────────────────────────
// Giống CheckboxFilter nhưng load options từ API (optionsQuery).

function CheckboxApiFilter(props: {
  config: SideFilterConfig;
  selected: Accessor<any[]>;
  onToggle: (value: any) => void;
}) {
  const [q, setQ] = createSignal('');

  // Load một lần khi mount — không cần pagination, lấy limit lớn
  const [options] = createResource<SideFilterOption[]>(async () => {
    if (!props.config.optionsQuery) return [];
    const raw = await props.config.optionsQuery.query({ input: { limit: 200 } });
    const edges: any[] = raw?.edges ?? raw?.items ?? raw ?? [];
    return edges.map((e: any) => {
      const node = e?.node ?? e;
      return props.config.optionsQuery!.option(node);
    });
  });

  const visible = createMemo(() => {
    const all = options() ?? [];
    const s = q().toLowerCase();
    if (!s) return all;
    return all.filter(o => String(o.label).toLowerCase().includes(s));
  });

  return (
    <div class="flex flex-col gap-0.5">
      {/* Search box: hiện khi đang loading hoặc có >= 6 item */}
      <Show when={(options()?.length ?? 0) >= 6 || props.config.searchable}>
        <Input
          class="mb-2 h-8 text-sm"
          placeholder="Tìm kiếm..."
          clearable
          onChange={v => setQ(v || '')}
        />
      </Show>

      <Show
        when={!options.loading}
        fallback={
          <div class="flex flex-col gap-1.5 py-1">
            <For each={[1, 2, 3]}>
              {() => <div class="h-5 bg-neutral-100 rounded animate-pulse" />}
            </For>
          </div>
        }
      >
        <Show when={(visible()?.length ?? 0) > 0} fallback={
          <p class="text-xs text-gray-400 py-1 italic">Không có dữ liệu</p>
        }>
          <For each={visible()}>
            {(opt) => {
              const checked = () => props.selected().includes(opt.value);
              return (
                <label class="flex items-center gap-2.5 cursor-pointer group
                              py-1 rounded hover:bg-neutral-50 -mx-1 px-1">
                  <input
                    type="checkbox"
                    class="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                    checked={checked()}
                    onChange={() => props.onToggle(opt.value)}
                  />
                  <span class={mergeClass(
                    'text-sm flex-1 leading-tight truncate',
                    checked() ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900',
                  )}>
                    {opt.label}
                  </span>
                  <Show when={opt.count !== undefined}>
                    <span class="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                      {opt.count}
                    </span>
                  </Show>
                </label>
              );
            }}
          </For>
        </Show>
      </Show>
    </div>
  );
}

// ─── MultiSelectFilter ────────────────────────────────────────────────────────
// Dùng component Select đã có — hỗ trợ search, lazy load, multi-select.
// Tối ưu cho danh sách dài (status, factory, ...) thay vì render hàng chục checkbox.

function MultiSelectFilter(props: {
  config: SideFilterConfig;
  selected: Accessor<any[]>;
  onChange: (values: any[]) => void;
}) {
  return (
    <Select
      multi
      type="array"
      clearable
      fieldless
      placeholder="Chọn..."
      value={props.selected()}
      onChange={(val) => props.onChange(Array.isArray(val) ? val : (val ? [val] : []))}
      {...(props.config.options ? { options: props.config.options } : {})}
      {...(props.config.optionsQuery ? { optionsQuery: props.config.optionsQuery as any } : {})}
    />
  );
}

// ─── SingleFilter ─────────────────────────────────────────────────────────────

function SingleFilter(props: {
  config: SideFilterConfig;
  selected: Accessor<any>;
  onSelect: (value: any) => void;
}) {
  const opts = () => [
    { label: 'Tất cả', value: null as any },
    ...(props.config.options ?? []),
  ];
  return (
    <div class="flex flex-col gap-0.5">
      <For each={opts()}>
        {(opt) => {
          const sel = () =>
            opt.value === null
              ? props.selected() === null || props.selected() === undefined
              : props.selected() === opt.value;
          return (
            <label class="flex items-center gap-2.5 cursor-pointer group
                          py-1 rounded hover:bg-neutral-50 -mx-1 px-1">
              <input
                type="radio"
                class="w-4 h-4 border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                checked={sel()}
                onChange={() => props.onSelect(opt.value)}
              />
              <span class={mergeClass(
                'text-sm flex-1 leading-tight truncate',
                sel() ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900',
              )}>
                {opt.label}
              </span>
              <Show when={opt.count !== undefined}>
                <span class="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {opt.count}
                </span>
              </Show>
            </label>
          );
        }}
      </For>
    </div>
  );
}

// ─── RangeFilter ─────────────────────────────────────────────────────────────

function RangeFilter(props: {
  config: SideFilterConfig;
  onUpdate: (min: number | null, max: number | null) => void;
}) {
  const [minVal, setMinVal] = createSignal<number | null>(null);
  const [maxVal, setMaxVal] = createSignal<number | null>(null);

  const flush = debounce(() => props.onUpdate(minVal(), maxVal()), 450);

  return (
    <div class="flex flex-col gap-2">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
            Từ
          </label>
          <Input
            type="number"
            placeholder={props.config.min !== undefined ? String(props.config.min) : 'Min'}
            min={props.config.min}
            max={props.config.max}
            step={props.config.step ?? 1}
            onChange={v => { setMinVal(v as any); flush(); }}
          />
        </div>
        <div>
          <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
            Đến
          </label>
          <Input
            type="number"
            placeholder={props.config.max !== undefined ? String(props.config.max) : 'Max'}
            min={props.config.min}
            max={props.config.max}
            step={props.config.step ?? 1}
            onChange={v => { setMaxVal(v as any); flush(); }}
          />
        </div>
      </div>
      <Show when={props.config.unit}>
        <span class="text-[11px] text-gray-400">Đơn vị: {props.config.unit}</span>
      </Show>
    </div>
  );
}

// ─── DateRangeFilter ─────────────────────────────────────────────────────────

function DateRangeFilter(props: {
  config: SideFilterConfig;
  onUpdate: (min: string | null, max: string | null) => void;
}) {
  const [from, setFrom] = createSignal('');
  const [to, setTo] = createSignal('');

  return (
    <div class="flex flex-col gap-2">
      <div>
        <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
          Từ ngày
        </label>
        <input
          type="date"
          class="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-gray-700
                 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          value={from()}
          onChange={e => {
            const v = e.currentTarget.value;
            setFrom(v);
            props.onUpdate(v || null, to() || null);
          }}
        />
      </div>
      <div>
        <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
          Đến ngày
        </label>
        <input
          type="date"
          class="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-gray-700
                 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          value={to()}
          onChange={e => {
            const v = e.currentTarget.value;
            setTo(v);
            props.onUpdate(from() || null, v || null);
          }}
        />
      </div>
    </div>
  );
}

// ─── BooleanFilter ────────────────────────────────────────────────────────────

function BooleanFilter(props: {
  selected: Accessor<boolean | null | undefined>;
  onSelect: (v: boolean | null) => void;
}) {
  const opts: { label: string; value: boolean | null }[] = [
    { label: 'Tất cả', value: null },
    { label: 'Có', value: true },
    { label: 'Không', value: false },
  ];
  return (
    <div class="flex flex-col gap-0.5">
      <For each={opts}>
        {(opt) => {
          const sel = () =>
            opt.value === null
              ? props.selected() === null || props.selected() === undefined
              : props.selected() === opt.value;
          return (
            <label class="flex items-center gap-2.5 cursor-pointer group
                          py-1 rounded hover:bg-neutral-50 -mx-1 px-1">
              <input
                type="radio"
                class="w-4 h-4 border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                checked={sel()}
                onChange={() => props.onSelect(opt.value)}
              />
              <span class={mergeClass(
                'text-sm flex-1',
                sel() ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900',
              )}>
                {opt.label}
              </span>
            </label>
          );
        }}
      </For>
    </div>
  );
}

// ─── DatatableSideFilter (main) ───────────────────────────────────────────────

export function DatatableSideFilter(props: DatatableSideFilterProps) {
  const { setSideFilter, isCompact } = useDatatable();

  const [panelOpen, setPanelOpen] = createSignal(props.defaultOpen !== false);
  const [mobileOpen, setMobileOpen] = createSignal(false);

  // Khởi tạo active filters từ defaultValue của từng config
  // NOTE: SolidJS createSignal KHÔNG nhận lazy function — phải gọi ngay
  const [active, setActive] = createSignal<ActiveFilters>(buildInitialActive(props.filters));

  const activeCount = createMemo(() => countActive(active()));

  // ── Sync active filters → context ─────────────────────────────────────────
  createEffect(() => {
    const qf = buildQueryFilter(active(), props.filters);
    setSideFilter(Object.keys(qf).length ? qf : (undefined as any));
  });

  // ── Mutators ───────────────────────────────────────────────────────────────

  function toggleCheckbox(field: string, value: any, apiMode = false) {
    setActive(prev => {
      const next = { ...prev };
      const t = next[field]?.type;
      const curr = (t === 'checkbox' || t === 'checkbox-api' || t === 'multi-select' ? (next[field] as any).value : []) as any[];
      const idx = curr.indexOf(value);
      const arr = idx >= 0 ? curr.filter((_, i) => i !== idx) : [...curr, value];
      if (!arr.length) delete next[field];
      else next[field] = { type: apiMode ? 'checkbox-api' : 'checkbox', value: arr };
      return next;
    });
  }

  // Dùng cho multi-select: Select trả về toàn bộ mảng mới (không toggle từng item)
  function setMultiValues(field: string, values: any[]) {
    setActive(prev => {
      // Shallow equality guard: createControl trong Select gọi onChange mỗi khi props.value
      // thay đổi reference — nếu nội dung không đổi, trả về prev để tránh vòng lặp vô hạn.
      const currEntry = prev[field];
      const curr: any[] =
        currEntry?.type === 'multi-select' ||
          currEntry?.type === 'checkbox' ||
          currEntry?.type === 'checkbox-api'
          ? (currEntry as any).value
          : [];
      if (
        curr.length === values.length &&
        curr.every((v, i) => v === values[i])
      ) {
        return prev; // same content → same signal reference → no reactive update
      }
      const next = { ...prev };
      if (!values.length) delete next[field];
      else next[field] = { type: 'multi-select', value: values };
      return next;
    });
  }

  function setSingle(field: string, value: any) {
    setActive(prev => {
      const next = { ...prev };
      if (value === null || value === undefined) delete next[field];
      else next[field] = { type: 'single', value };
      return next;
    });
  }

  function setRange(field: string, min: number | null, max: number | null) {
    setActive(prev => {
      const next = { ...prev };
      if (min === null && max === null) delete next[field];
      else next[field] = { type: 'range', value: { min, max } };
      return next;
    });
  }

  function setDateRange(field: string, min: string | null, max: string | null) {
    setActive(prev => {
      const next = { ...prev };
      if (!min && !max) delete next[field];
      else next[field] = { type: 'date-range', value: { min, max } };
      return next;
    });
  }

  function setBoolean(field: string, value: boolean | null) {
    setActive(prev => {
      const next = { ...prev };
      if (value === null) delete next[field];
      else next[field] = { type: 'boolean', value };
      return next;
    });
  }

  function clearAll() {
    setActive({});
  }

  // ── Field renderer ─────────────────────────────────────────────────────────

  function isFieldActive(config: SideFilterConfig): boolean {
    const entry = active()[config.field];
    if (!entry) return false;
    if (entry.type === 'checkbox' || entry.type === 'checkbox-api' || entry.type === 'multi-select') return entry.value.length > 0;
    if (entry.type === 'range') {
      return (entry.value.min !== null && entry.value.min !== undefined)
        || (entry.value.max !== null && entry.value.max !== undefined);
    }
    if (entry.type === 'date-range') return !!(entry.value.min || entry.value.max);
    return entry.value !== null && entry.value !== undefined;
  }

  function renderField(config: SideFilterConfig) {
    return (
      <FilterGroup
        label={config.label}
        defaultExpanded={config.defaultExpanded}
        hasActive={isFieldActive(config)}
      >
        {config.type === 'checkbox' && (
          <CheckboxFilter
            config={config}
            selected={() =>
              active()[config.field]?.type === 'checkbox'
                ? (active()[config.field] as any).value
                : []
            }
            onToggle={v => toggleCheckbox(config.field, v, false)}
          />
        )}
        {config.type === 'checkbox-api' && (
          <CheckboxApiFilter
            config={config}
            selected={() => {
              const t = active()[config.field]?.type;
              return t === 'checkbox' || t === 'checkbox-api' || t === 'multi-select'
                ? (active()[config.field] as any).value
                : [];
            }}
            onToggle={v => toggleCheckbox(config.field, v, true)}
          />
        )}
        {config.type === 'multi-select' && (
          <MultiSelectFilter
            config={config}
            selected={() => {
              const t = active()[config.field]?.type;
              return t === 'checkbox' || t === 'checkbox-api' || t === 'multi-select'
                ? (active()[config.field] as any).value
                : [];
            }}
            onChange={vals => setMultiValues(config.field, vals)}
          />
        )}
        {config.type === 'single' && (
          <SingleFilter
            config={config}
            selected={() =>
              active()[config.field]?.type === 'single'
                ? (active()[config.field] as any).value
                : undefined
            }
            onSelect={v => setSingle(config.field, v)}
          />
        )}
        {config.type === 'range' && (
          <RangeFilter
            config={config}
            onUpdate={(min, max) => setRange(config.field, min, max)}
          />
        )}
        {config.type === 'date-range' && (
          <DateRangeFilter
            config={config}
            onUpdate={(min, max) => setDateRange(config.field, min, max)}
          />
        )}
        {config.type === 'boolean' && (
          <BooleanFilter
            selected={() =>
              active()[config.field]?.type === 'boolean'
                ? (active()[config.field] as any).value
                : undefined
            }
            onSelect={v => setBoolean(config.field, v)}
          />
        )}
      </FilterGroup>
    );
  }

  // ── Panel header (shared) ──────────────────────────────────────────────────

  const PanelHeader = (p: {
    title?: string;
    showCollapseBtn?: boolean;
    collapseRight?: boolean;
    onCollapse?: () => void;
    collapsed?: boolean;
  }) => (
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-blue-500 shrink-0"><IconFilter /></span>
        <Show when={p.title !== undefined ? p.title : !p.collapsed}>
          <span class="text-sm font-bold text-gray-700 whitespace-nowrap">
            {p.title ?? 'Bộ lọc'}
          </span>
        </Show>
        <Show when={activeCount() > 0}>
          <span class="bg-blue-600 text-white text-[10px] font-bold rounded-full
                       w-5 h-5 flex items-center justify-center shrink-0">
            {activeCount()}
          </span>
        </Show>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <Show when={activeCount() > 0 && !p.collapsed}>
          <button
            type="button"
            class="text-[11px] font-medium text-red-400 hover:text-red-600
                   px-2 py-1 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
            onClick={clearAll}
          >
            Xóa hết
          </button>
        </Show>
        <Show when={p.showCollapseBtn}>
          <button
            type="button"
            class="p-1.5 rounded-lg hover:bg-neutral-100 text-gray-400
                   hover:text-gray-600 transition-colors"
            onClick={p.onCollapse}
            title={p.collapsed ? 'Mở rộng bộ lọc' : 'Thu gọn'}
          >
            <IconChevronLeft
              class={mergeClass(
                'w-4 h-4',
                p.collapseRight
                  ? (p.collapsed ? 'rotate-180' : 'rotate-0')
                  : (p.collapsed ? 'rotate-0' : 'rotate-180'),
              )}
            />
          </button>
        </Show>
      </div>
    </div>
  );

  // ── Panel body ─────────────────────────────────────────────────────────────

  const FilterBody = () => (
    <div class="overflow-y-auto overscroll-contain"
      style={{ 'max-height': 'calc(100vh - 120px)' }}>
      <For each={props.filters}>{cfg => renderField(cfg)}</For>
    </div>
  );

  // ── Desktop: sidebar ───────────────────────────────────────────────────────
  // sticky top-4: sidebar bám theo viewport khi scroll table dài
  // self-start: cần thiết để sticky hoạt động trong flex container

  const DesktopSidebar = () => (
    <div class={mergeClass(
      'sticky top-4 self-start shrink-0',
      panelOpen() ? 'w-72' : 'w-auto',
    )}>
      {/* Card */}
      <div class="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <PanelHeader
          showCollapseBtn
          collapseRight={props.position === 'right'}
          collapsed={!panelOpen()}
          onCollapse={() => setPanelOpen(v => !v)}
        />
        <Show when={panelOpen()}>
          <FilterBody />
        </Show>
      </div>
    </div>
  );

  // ── Mobile: toggle button + expandable panel ───────────────────────────────

  const MobileTrigger = () => (
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200
             bg-white shadow-xs hover:bg-neutral-50 active:bg-neutral-100
             transition-colors text-sm font-semibold text-gray-700 w-full"
      onClick={() => setMobileOpen(v => !v)}
    >
      <span class="text-blue-500 shrink-0"><IconFilter /></span>
      <span class="flex-1 text-left">Bộ lọc</span>
      <Show when={activeCount() > 0}>
        <span class="bg-blue-600 text-white text-xs font-bold rounded-full
                     min-w-[1.25rem] h-5 px-1 flex items-center justify-center shrink-0">
          {activeCount()}
        </span>
      </Show>
      <IconChevronDown class={mergeClass('text-gray-400 shrink-0', mobileOpen() && 'rotate-180')} />
    </button>
  );

  const MobilePanel = () => (
    <Show when={mobileOpen()}>
      <div class="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <PanelHeader title="Bộ lọc" />
        {/* 1 cột mobile, 2 cột tablet */}
        <div class="grid grid-cols-1 sm:grid-cols-2">
          <For each={props.filters}>
            {cfg => (
              <div class="border-b border-neutral-100 last:border-b-0 sm:odd:border-r sm:odd:border-neutral-100">
                {renderField(cfg)}
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Show
      when={!isCompact()}
      fallback={
        /* Mobile / tablet: stacked */
        <div class={mergeClass('flex flex-col gap-2', props.class)}>
          <MobileTrigger />
          <MobilePanel />
          <div class="flex flex-col gap-2">{props.children}</div>
        </div>
      }
    >
      {/* Desktop: side-by-side */}
      <div class={mergeClass(
        'flex gap-3 items-start',
        props.position === 'right' && 'flex-row-reverse',
        props.class,
      )}>
        <DesktopSidebar />
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          {props.children}
        </div>
      </div>
    </Show>
  );
}
