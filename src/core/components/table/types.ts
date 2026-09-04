// @core/components/table/types.ts
//
// Shared, business-agnostic type declarations for the table/ cluster.
// Kept here (not in Table.tsx or Datatable.tsx) so both core/ and shared/
// components can depend on them without creating a core→shared import.

import { ESort } from '@core/api/types';

export interface SortQueryInput {
  field: string;
  direction: ESort | 'ASC' | 'DESC';
}

export interface SearchQueryInput {
  query?: string;
  fields?: string[];
}
