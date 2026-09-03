// src/modules/cms/cmsFilterOperator.constants.ts
//
// Canonical CMS filter/visibility-condition operator option list (Task 9, enum/type-safety
// sweep §3.7) — single source for the 4 previously-independent hand-typed option arrays in
// GenericFilterListInput.tsx / FormVisibilityRulesInput.tsx / ContentVisibilityRulesInput.tsx /
// NodeDataSourceTab.tsx (`DataSourceFilterEditor`). Kept OUT of cms.types.ts on purpose — that
// file is primarily types-only (its one deliberate exception being `EFieldDisplayVariant`, a
// Task 14 `as const` runtime export — see that const's own doc comment for why it lives there
// despite the file's general convention) and this is a runtime value with no similar reason to
// sit alongside the types it options.
//
// Exposed as a FUNCTION (not a bare array) so every consumer re-evaluates `t()` on locale
// change — matching the `OPERATOR_OPTIONS = () => [...]` pattern each of the 4 files already
// used for their own hand-typed list before this unification. A bare top-level `const` would
// instead freeze every label to whichever locale was active at module-import time.
//
// Labels are sourced from the `cms.sections.genericFilter.op*` i18n keys — verified
// byte-identical (both `vi` and `en`, see cms.i18n.ts) to the `cms.contentTypes.visibility.op*`
// keys ContentVisibilityRulesInput.tsx/FormVisibilityRulesInput.tsx used directly before this
// change, so redirecting those 2 files through this shared list changes zero visible text.
//
// Only the 7 members ANY of the 4 files actually exposed before this change (EQUALS..
// LESS_THAN_OR_EQUAL + LIKE) — not all 15 `EFilterOperator` members — matching every one of
// those files' own pre-existing (narrower) subset; consumers that need fewer than these 7
// (FormVisibilityRulesInput.tsx/ContentVisibilityRulesInput.tsx, which never exposed LIKE)
// `.filter()` this list down further, same as before.
import { EFilterOperator } from '@core/api/types';
import { EFilterValueSource } from './cms.types';
import { t } from '@/shared/i18n/t';

export const CMS_FILTER_OPERATOR_OPTIONS = (): Array<{ value: EFilterOperator; label: string }> => [
    { value: EFilterOperator.EQUALS, label: t('cms.sections.genericFilter.opEq') },
    { value: EFilterOperator.NOT_EQUALS, label: t('cms.sections.genericFilter.opNe') },
    { value: EFilterOperator.GREATER_THAN, label: t('cms.sections.genericFilter.opGt') },
    { value: EFilterOperator.GREATER_THAN_OR_EQUAL, label: t('cms.sections.genericFilter.opGte') },
    { value: EFilterOperator.LESS_THAN, label: t('cms.sections.genericFilter.opLt') },
    { value: EFilterOperator.LESS_THAN_OR_EQUAL, label: t('cms.sections.genericFilter.opLte') },
    { value: EFilterOperator.LIKE, label: t('cms.sections.genericFilter.opLike') },
];

/** Final whole-branch review, Important #2 — the same "single canonical option list, exposed as
 * a function so `t()` re-evaluates on locale change" pattern as `CMS_FILTER_OPERATOR_OPTIONS`
 * above, but for the sibling `GenericDataSourceFilter.valueSource` field (`EFilterValueSource`,
 * cms.types.ts). Single source for the 2 previously byte-identical hand-typed option arrays in
 * GenericFilterListInput.tsx and NodeDataSourceTab.tsx (`DataSourceFilterEditor`). */
export const CMS_VALUE_SOURCE_OPTIONS = (): Array<{ value: EFilterValueSource; label: string }> => [
    { value: EFilterValueSource.STATIC, label: t('cms.sections.genericFilter.valueSourceStatic') },
    { value: EFilterValueSource.PATH_PARAM, label: t('cms.sections.genericFilter.valueSourcePathParam') },
    { value: EFilterValueSource.QUERY_PARAM, label: t('cms.sections.genericFilter.valueSourceQueryParam') },
];
