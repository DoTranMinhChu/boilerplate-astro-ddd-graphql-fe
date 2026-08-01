import { debounce } from '@solid-primitives/scheduled';
import { baseConfig } from '@core/components/config/BaseConfig';
import { createEffect, createSignal } from 'solid-js';
import { Input } from '../control/Input';
import { Select } from '../control/Select';
import { useDatatable } from './DatatableContext';

export interface DatatableSearchProps extends BaseProps {
  field?: string | string[];
}
export function DatatableSearch(props: DatatableSearchProps) {
  const { service, setSearch } = useDatatable();
  const [searchText, setSearchText] = createSignal('');
  const [field, setField] = createSignal<string | string[]>();
  const fieldOption = () =>
    service.searchableFields.find((x) => x.value == field());

  const fields = () =>
    (field()
      ? typeof field() == 'string'
        ? [field()]
        : field()
      : []) as string[];

  const searchTrigger = debounce((searchText: string) => {
    const option = fieldOption();
    switch (option?.type) {
      case 'phone': {
        let phoneText = searchText;
        if (phoneText.startsWith('0')) {
          phoneText = phoneText.slice(1);
        }
        setSearch(() => ({ fields: fields(), query: phoneText }));
        break;
      }
      default: {
        setSearch(() => ({ fields: fields(), query: searchText }));
      }
    }
  }, 350);

  createEffect(() => {
    if (props.field) {
      setField(() => props.field);
    }
  });

  return (
    <Input
      class={`bg-lightest w-auto rounded-md border-neutral-200 hover:border-neutral-300`}
      clearable
      iconClass="text-neutral"
      icon={baseConfig().iconSearch()}
      placeholder={
        props.field
          ? baseConfig().datatableSearchByLabel(fieldOption()?.label || '')
          : baseConfig().datatableSearchPlaceholder
      }
      suffix={
        !props.field && (
          <Select
            class={
              '-mr-2 min-h-8 rounded-none border-t-0 border-r-0 border-b-0 border-l border-neutral-100 bg-transparent pl-1 ' +
              'focus-within:border-neutral-100 focus-within:bg-transparent focus-within:ring-0 focus-within:outline-hidden hover:border-neutral-100'
            }
            native
            options={service.searchableFields}
            value={field()}
            onChange={(val) => {
              setField(val);
              if (searchText()) {
                setSearch({ fields: fields(), query: searchText() });
              }
            }}
          />
        )
      }
      onChange={(val) => {
        setSearchText(val);
        if (val) {
          searchTrigger(val);
        } else {
          searchTrigger.clear();
          setSearch();
        }
      }}
    />
  );
}
