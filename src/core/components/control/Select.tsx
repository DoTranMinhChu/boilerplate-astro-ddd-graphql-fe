import { debounce } from '@solid-primitives/scheduled';
import { GraphQL } from '@core/api/graphql';
import { PaginationCursor } from '@core/api/types';
import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { normalizeString } from '@core/helpers/string';
import { LOAD_ALL_LIMIT } from '@core/services/base.service';
import { FocusEventHandler } from '@core/types/jsx';
import {
  Ref,
  Show,
  createEffect,
  createSignal,
  splitProps,
  untrack,
  JSX,
} from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';
import { ImgProps } from '../utilities/Img';
import { DropdownSelect } from './DropdownSelect';
import { InputWrapper, InputWrapperProps } from './InputWrapper';
import { NativeSelect } from './NativeSelect';
import { ControlType, createControl } from './createControl';

// Task 5 (Group 1 core/shared restructure): agency-tenant-scoping resolver, same DI pattern
// as core/api/graphql.ts's _actingTenantResolver — a module-level settable resolver instead of
// importing shared/contexts/agency/agencyActingTenant directly, so this core/ component doesn't
// depend on shared/. Wired to the real implementation in shared/contexts/auth/AuthProvider.tsx,
// alongside the other resolvers wired there. Default resolver returns undefined ("no filter
// injected"), matching current behavior for a non-agency user / before AuthProvider wires it.
let _agencyActingTenantIdResolver: () => string | null | undefined = () => undefined;

export function setAgencyActingTenantIdResolver(fn: () => string | null | undefined) {
  _agencyActingTenantIdResolver = fn;
}

// --- Types ---
export type Option<T = any, D = any> = {
  label: string | number;
  value: T;
  subText?: string;
  image?: string;
  avatar?: string;
  color?: string;
  group?: string;
  data?: D;
};

export type RenderFunction<OptionType, ItemType> = (
  item: Option<OptionType, ItemType> | null | undefined,
  state: {
    isInDropdown?: boolean;
    isHighlighted?: boolean;
    isSelected?: boolean;
  },
) => JSX.Element;

export type OptionGroup<OptionType = any, ItemType = any> = {
  group: string;
  offset: number;
  options: Option<OptionType, ItemType>[];
};

const DEFAULT_QUERY_LIMIT = 20;

export interface SelectProps<OptionType, ItemType>
  extends SelectDropdownProps<OptionType, ItemType>,
  FormControlProps<OptionType>,
  Omit<InputWrapperProps, 'onClear'> {
  type?: ControlType;
  loading?: boolean;
  native?: boolean;
  options?: Option<any>[];
  optionsQuery?: {
    query: (args: {
      input: any;
    }) => Promise<PaginationCursor<ItemType> | undefined | null>;
    option: (item: ItemType) => Option<OptionType>;
    onOptionsChange?: (options: Option<OptionType>[]) => any;
    trigger?: any;
    limit?: number;
    loadAll?: boolean;
    filter?: any;
  };
  onItemChange?: (item: ItemType | undefined) => any;
  hasRefresh?: boolean;
  hasCreate?: boolean;
  selectClass?: string;
  selectRef?: Ref<HTMLSelectElement>;
  inputRef?: Ref<HTMLInputElement>;
  iconSelect?: JSX.Element;
  iconLoading?: JSX.Element;
  emptyPlaceholder?: string;
  emptyOptionsPlaceholder?: string;
  instructionPlaceholder?: string;
  defaultGroupPlaceholder?: string;
}

export type SelectDropdownProps<OptionType, ItemType> = Pick<
  ImgProps,
  'ratio'
> & {
  imageClass?: string;
  multi?: boolean;
  hasAvatar?: boolean;
  hasImage?: boolean;
  hasColor?: boolean;
  hasSubtext?: boolean;
  renderFn?: RenderFunction<OptionType, ItemType>;
};

// --- Component ---
export function Select<OptionType, ItemType>(
  props: SelectProps<OptionType, ItemType>,
) {
  let ref: Ref<HTMLDivElement>;

  const [wrapperProps, selectProps] = splitProps(
    props,
    [
      'class', 'prefix', 'prefixClass', 'icon', 'iconClass', 'suffix',
      'suffixClass', 'endIcon', 'endIconClass', 'ref', 'onWrapperFocus', 'onWrapperBlur',
    ],
    [
      'id', 'emptyPlaceholder', 'emptyOptionsPlaceholder', 'instructionPlaceholder',
      'ref', 'class', 'value', 'onChange', 'defaultValue', 'readOnly',
      'disabled', 'error', 'fieldless', 'nullable', 'options', 'onFocus',
      'onBlur', 'selectRef', 'renderFn', 'inputRef', 'hasAvatar', 'hasImage',
      'hasColor', 'hasSubtext', 'ratio', 'imageClass',
    ],
  );

  const type = () => props.type || 'id';
  const {
    id, name, readOnly, defaultValue, value, onChange, error, getEmptyValue, hasInited,
  } = createControl<OptionType>(type(), selectProps);

  const clearable = () =>
    props.clearable &&
    value() !== '' &&
    value() !== null &&
    value() !== undefined &&
    !loading();

  // Signals
  const [options, setOptions] = createSignal<Option<any>[]>([]);
  const [inputOptions, setInputOptions] = createSignal<{
    [key: string]: {
      totalCount: number;
      options: Option<any>[];
      hasNextPage: boolean;
      endCursor: string | null;
    };
  }>({});

  const [idOptions, setIdOptions] = createSignal<Option<any>[]>([]);
  const [selectedMeta, setSelectedMeta] = createSignal<Option<any>[]>([]);

  const [inputText, setInputText] = createSignal('');
  const [queryText, setQueryText] = createSignal('');
  const [fixedOptions, setFixedOptions] = createSignal<Option<any>[]>([]);
  const [loading, setLoading] = createSignal(false);

  const searchTrigger = debounce((searchText: string) => {
    setQueryText(searchText);
  }, 350);

  const iconSelect = () => props.iconSelect || baseConfig().iconSelect();
  const iconLoading = () => props.iconLoading || baseConfig().iconLoader();
  const emptyPlaceholder = () => props.placeholder || props.emptyPlaceholder || baseConfig()?.selectEmptyPlaceholder || '';
  const emptyOptionsPlaceholder = () => props.emptyOptionsPlaceholder || baseConfig()?.selectEmptyOptionsPlaceholder || '';
  const instructionPlaceholder = () => props.placeholder || props.instructionPlaceholder || baseConfig()?.selectInstructionPlaceholder || '';
  const defaultGroupPlaceholder = () => props.defaultGroupPlaceholder || baseConfig()?.selectDefaultGroupPlaceholder || '';

  createEffect(() => {
    if (props.options) {
      setFixedOptions(props.options);
      setLoading(false);
    }
  });

  const loadIdOptionsQuery = async (ids: string[]) => {
    if (props.optionsQuery && !props.optionsQuery.loadAll) {
      const { option, query, filter } = props.optionsQuery;
      const res = await query({
        input: {
          limit: ids.length,
          filter: { id: { $in: ids }, ...filter },
        },
      });
      if (res?.edges) {
        const mapped = res.edges.map((e: any) => ({
          ...option(e!.node as ItemType),
          data: e!.node,
        }));
        setIdOptions(mapped);
      }
    }
  };

  const loadOptionsQuery = async (searchStr: string, after: string | null) => {
    if (!props.optionsQuery) return;

    return await untrack(async () => {
      const { option, query, onOptionsChange, limit, loadAll, filter } = props.optionsQuery!;
      setLoading(true);
      try {
        // Parase 2: Agency đang chọn 1 tổ chức → giới hạn options dropdown theo tổ chức đó
        // (đồng bộ với việc lọc danh sách). Backend bỏ qua tenantId với entity không có cột này.
        const actingTenant = _agencyActingTenantIdResolver();
        const scopedFilter = actingTenant ? { ...(filter ?? {}), tenantId: actingTenant } : filter;
        const res = await query({
          input: {
            limit: loadAll ? LOAD_ALL_LIMIT : limit || DEFAULT_QUERY_LIMIT,
            after: after,
            search: searchStr || undefined,
            filter: scopedFilter,
          },
        });

        if (res) {
          const newFetched: Option<any>[] = (res.edges || []).map((e: any) => ({
            ...option(e!.node as ItemType),
            data: e!.node,
          }));

          const prevData = after ? (inputOptions()[searchStr]?.options || []) : [];
          const combinedOptions = [...prevData, ...newFetched];

          setInputOptions({
            ...inputOptions(),
            [searchStr]: {
              totalCount: res.pageInfo?.totalCount || 0,
              options: combinedOptions,
              hasNextPage: res.pageInfo?.hasNextPage || false,
              endCursor: res.pageInfo?.endCursor || null,
            },
          });

          setFixedOptions(combinedOptions);
          if (onOptionsChange) onOptionsChange(combinedOptions);
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const loadMoreOptions = async () => {
    const searchStr = queryText();
    const currentCache = inputOptions()[searchStr];
    if (
      props.optionsQuery &&
      !loading() &&
      currentCache?.hasNextPage &&
      currentCache?.endCursor
    ) {
      await loadOptionsQuery(searchStr, currentCache.endCursor);
    }
  };

  createEffect(() => {
    const val = value() as string | string[];
    if (val && (Array.isArray(val) ? val.length > 0 : true)) {
      if (props.optionsQuery && !props.optionsQuery.loadAll) {
        const valArray = Array.isArray(val) ? val : [val];
        const missingIds = valArray.filter(v => !fixedOptions().find(o => o.value === v));
        if (missingIds.length > 0) {
          loadIdOptionsQuery(missingIds);
        }
      }
    }
  });

  createEffect(() => {
    const q = queryText();
    loadOptionsQuery(q, null);
  });

  createEffect(() => {
    const inputVal = inputText();
    const q = queryText();
    const fixed = fixedOptions();
    const ids = idOptions();
    const metas = selectedMeta();

    untrack(() => {
      let currentOptions: Option<any>[] = [];

      if (props.optionsQuery && !props.optionsQuery.loadAll) {
        const cache = inputOptions()[q];
        currentOptions = cache ? cache.options : fixed;
      } else {
        if (inputVal) {
          const text = normalizeString(inputVal).trim().toLowerCase();
          currentOptions = fixed.filter((o) =>
            normalizeString(o.label?.toString() + (o.subText?.toString() || ''))
              .toLowerCase()
              .includes(text),
          );
        } else {
          currentOptions = fixed;
        }
      }

      const allSelected = [...metas, ...ids];
      const optionsMap = new Map();
      currentOptions.forEach(o => optionsMap.set(o.value, o));
      allSelected.forEach(o => {
        if (!optionsMap.has(o.value)) {
          optionsMap.set(o.value, o);
        }
      });

      setOptions(Array.from(optionsMap.values()));
    });
  });

  createEffect(() => {
    const val = value();
    const opts = options();
    props.onItemChange?.(opts.find((i) => i.value === val)?.data);
  });

  const optionGroups = () => {
    const opts = options();
    const hasGroup = !!opts.find((x) => x.group);
    if (!hasGroup) return [];

    const groupedObj = opts.reduce((acc, item) => {
      const gName = item.group || defaultGroupPlaceholder() || 'Khác';
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(item);
      return acc;
    }, {} as any);

    return Object.keys(groupedObj).map((key) => ({
      group: key,
      offset: 0,
      options: groupedObj[key],
    }));
  };

  const refresh = () => {
    GraphQL.resetClient();
    setInputOptions({});
    loadOptionsQuery(queryText(), null);
  };

  const handleFocus: FocusEventHandler<HTMLElement, FocusEvent> = (e) => {
    props.onFocus?.(e);
  };
  const handleBlur: FocusEventHandler<HTMLElement, FocusEvent> = (e) => {
    props.onBlur?.(e);
  };

  createEffect(() => {
    if (hasInited() && !value() && !props.clearable && options().length) {
      onChange(options()[0].value);
    }
  });

  const handleLocalChange = (incomingVal: any) => {
    const selectedItemObject = options().find(o => o.value === incomingVal);

    if (props.multi) {
      if (Array.isArray(incomingVal)) {
        onChange(incomingVal as any);
        return;
      }

      const rawVal = value();
      let currentArray: any[] = [];
      if (Array.isArray(rawVal)) {
        currentArray = [...rawVal];
      } else if (rawVal) {
        currentArray = [rawVal];
      }

      const exists = currentArray.includes(incomingVal);
      let newArray;
      let newMeta = [...selectedMeta()];

      if (exists) {
        newArray = currentArray.filter((item) => item !== incomingVal);
        newMeta = newMeta.filter(item => item.value !== incomingVal);
      } else {
        newArray = [...currentArray, incomingVal];
        if (selectedItemObject) {
          if (!newMeta.find(m => m.value === incomingVal)) {
            newMeta.push(selectedItemObject);
          }
        }
      }

      setSelectedMeta(newMeta);
      onChange(newArray as any);
    } else {
      if (selectedItemObject) {
        setSelectedMeta([selectedItemObject]);
      }
      onChange(incomingVal);
    }
  };

  // Cập nhật class để chống tràn cho Multi Select
  const selectClass = () =>
    mergeClass(
      'pl-2 pr-8 bg-transparent font-normal text-base rounded-inherit focus:outline-none min-w-0 appearance-none',
      (value() === undefined || value() === null) && 'text-neutral-300',
      props.multi && 'h-auto min-h-[40px] py-1.5 flex flex-wrap gap-1', // Cho phép ngắt dòng và tự tăng chiều cao
      props.selectClass,
    );

  return (
    <div class={`flex gap-2 ${loading() && !options().length ? 'pointer-events-none opacity-60' : ''}`}>
      <InputWrapper
        {...wrapperProps}
        readOnly={readOnly()}
        // Đảm bảo Wrapper không khống chế chiều cao cố định khi ở chế độ multi
        class={mergeClass(wrapperProps.class, 'flex-1', props.multi && 'h-auto')}
        ref={mergeRef(props.ref, (el) => (ref = el))}
        endIcon={loading() ? iconLoading() : iconSelect()}
        error={error()}
        maxLength={props.maxLength}
        clearable={clearable()}
        onClear={() => {
          setSelectedMeta([]);
          onChange(getEmptyValue() as any)
        }}
      >
        {props.native ? (
          <NativeSelect
            {...selectProps}
            id={id()}
            name={name()}
            readOnly={readOnly()}
            defaultValue={defaultValue() as any}
            error={error()}
            placeholder={props.placeholder}
            // The consumer's raw `clearable` intent — NOT the locally-computed `clearable()`
            // (line ~128), which gates on `value() !== ''` for the InputWrapper's "×" clear
            // button and would therefore hide NativeSelect's blank <option> at exactly the
            // moment (an empty value) it needs to exist. Without this, a native select with no
            // real "nothing selected" option falls back to the browser default of highlighting
            // the first real <option> — which then LOOKS chosen while the underlying Solid
            // value stays '' (found live in Phase 8: KitStarterFields' kit picker looked like
            // "Gaming Neon" was selected but produced a zero-Section page).
            clearable={props.clearable}
            emptyPlaceholder={emptyPlaceholder()}
            class={selectClass()}
            value={value()}
            onChange={handleLocalChange}
            options={options() as any}
            optionGroups={optionGroups()}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectRef={props.selectRef}
            multi={props.multi}
          />
        ) : (
          <DropdownSelect
            {...selectProps}
            id={id()}
            name={name()}
            readOnly={readOnly()}
            defaultValue={defaultValue() as any}
            error={error()}
            emptyPlaceholder={emptyPlaceholder()}
            emptyOptionsPlaceholder={emptyOptionsPlaceholder()}
            instructionPlaceholder={instructionPlaceholder()}
            ref={ref! as HTMLDivElement}
            class={selectClass()}
            value={value()}
            onChange={handleLocalChange}
            options={options() as any}
            optionGroups={optionGroups()}
            onFocus={handleFocus}
            onBlur={handleBlur}
            inputText={inputText()}
            onInputTextChange={(val) => {
              setInputText(val);
              if (props.optionsQuery && !props.optionsQuery.loadAll) {
                searchTrigger(val);
              }
            }}
            onScrollToBottom={loadMoreOptions}
            renderFn={props.renderFn}
            inputRef={props.inputRef}
            multi={props.multi}
          />
        )}
      </InputWrapper>
      <Show when={props.hasRefresh}>
        <Button outline icon={baseConfig().iconRefresh()} onClick={refresh} />
      </Show>
    </div>
  );
}
