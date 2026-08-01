import { FilterQueryInput } from '@core/api/types';
import { Form } from '@core/components/form/Form';
import { Util } from '@core/helpers/util';
import { useDatatable } from './DatatableContext';

export interface DatatableFilterProps extends BaseProps {}
export function DatatableFilter(props: DatatableFilterProps) {
  const { setFilter } = useDatatable();
  return (
    <Form
      class="flex flex-wrap justify-end gap-2"
      onChange={(values, fields) => {
        const filter: FilterQueryInput = {};
        Object.keys(fields).map((key) => {
          const value = Util.get(values, key) as any;
          const field = fields[key];
          if (value !== undefined) {
            if (field?.nullable) {
              if (value !== null) {
                filter[key] = {
                  EQ: value,
                };
              }
            } else {
              filter[key] = {
                EQ: value,
              };
            }
          }
        });
        if (Object.keys(filter).length) {
          setFilter(filter);
        } else {
          setFilter();
        }
      }}
    >
      {props.children}
    </Form>
  );
}
