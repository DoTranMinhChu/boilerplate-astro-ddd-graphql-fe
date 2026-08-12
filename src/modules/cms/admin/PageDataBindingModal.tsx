// src/modules/cms/admin/PageDataBindingModal.tsx
//
// Phase 0 M1 Task 11 — admin UI to configure `Page.dataBinding`: marks a Node-tree page as a
// "detail page" bound to 1 Content Type, matched against the current URL via `genericFilters`
// (see PageDataBinding, cms.types.ts) — the Node-tree equivalent of the legacy Section system's
// CONTENT_DETAIL block (builder/ContentTab.tsx's ContentDetailDataSourceFields), which stays
// available in M1 but is no longer the only way to build a detail page.
//
// Step 0 investigation (do NOT trust the task brief's guessed `<Modal open=.../>` +
// `<Form onSubmit=.../>` sample — verified against real code instead):
//   - `@core/components/form/Field.tsx` reads context via `useForm()`/`FormContext`, a GENERIC
//     context (not Datatable-specific) — confirmed by `grep useForm|FormContext` on Field.tsx/
//     createControl.tsx. Standalone `<Form>`/`<Field>` outside `Datatable.Formlog` is safe.
//   - There is no `Modal`+`Form` combo built by hand anywhere in cms/admin; the REAL idiom for a
//     standalone (non-Datatable) Modal+Form is `generateFormlog()` (@core/components/dialog/
//     Formlog.tsx), which bundles a `Dialog` (built on `Modal`) + `Form` + `Field` in ONE
//     component — exactly the pattern TermTreeEditor.tsx's `TermFormDialog` / MenuTreeEditor.tsx's
//     equivalent already use for a non-Datatable create/edit dialog. Real prop names (verified
//     against Formlog.tsx/Modal.tsx, NOT the brief's guesses): `isOpen`/`onClose`/`title` (not
//     `open`), `initialValues`/`handleSubmit`/`onSubmitted` (not `onSubmit`).
//   - `GenericFilterListInput` needs a `<Field name="...">` ancestor (it calls `createControl`)
//     AND needs `fieldOptions` computed from whichever Content Type is CURRENTLY selected in the
//     form — read reactively via `useForm().value()` from inside the form tree, exactly like
//     ContentTab.tsx's `ContentDetailDataSourceFields`/`DataSourceFields` already do for the
//     Section-level equivalent. A prop passed in from outside the form would go stale the moment
//     the admin changes the Content Type dropdown.
//   - Mounted PERMANENTLY by the caller (manageCmsPages.page.tsx does NOT wrap this in `<Show>`),
//     only `isOpen` toggles — TermTreeEditor.tsx's own comment documents why: `Modal`'s backdrop
//     cleanup only runs off an `isOpen` true→false effect; unmounting the whole subtree while
//     still open skips that effect and leaves a full-screen backdrop that blocks every click (a
//     real bug caught in that task's manual QA). `page` is therefore optional (undefined before
//     the admin opens this for the first time).
import { Show, createResource } from 'solid-js';
import { generateFormlog } from '@core/components/dialog/Formlog';
import { Field } from '@core/components/form/Field';
import { useForm } from '@core/components/form/FormContext';
import { Select } from '@core/components/control/Select';
import { GenericFilterListInput } from './GenericFilterListInput';
import { ContentTypeService, ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import { PageService, PageDTO } from '@/shared/services/page/page.service';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';
import type { PageDataBinding, GenericDataSourceFilter } from '@/modules/cms/cms.types';
import type { Edge } from '@core/api/types';

export interface PageDataBindingModalProps {
    /** Optional — this component is meant to be mounted permanently by the caller (see file
     * header); `page` is undefined before the admin opens it for the first time. */
    page: PageDTO | undefined;
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

interface DataBindingFormValues {
    contentTypeId?: string;
    genericFilters?: GenericDataSourceFilter[];
}

export function PageDataBindingModal(props: PageDataBindingModalProps) {
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .map((e) => e.node)
        .filter((n): n is ContentTypeDTO => !!n);
    const contentTypeOptions = () => contentTypesFull().map((c) => ({ value: c.id!, label: c.label! }));

    const { Formlog } = generateFormlog<DataBindingFormValues, PageDTO>({
        handleSubmit: async (values) => {
            const page = props.page;
            if (!page?.id) return undefined;
            // `mode: 'detail'` set explicitly here (not read back from a hidden Field) — this
            // modal only ever writes 1 mode, same approach TermFormDialog/MenuTreeEditor's
            // dialogs use to build their mutation payload from named `values` rather than
            // forwarding raw form data.
            const dataBinding: PageDataBinding = {
                mode: 'detail',
                contentTypeId: values.contentTypeId,
                genericFilters: values.genericFilters || [],
            };
            try {
                // `UpdatePageInput.dataBinding` is a Mixed JSONB scalar — typed-graphql-builder
                // codegen emits `string` for it (see comment atop cms.types.ts); `as any` here is
                // the same, single cast point already used for `style`/`content`/`animation` at
                // other Mixed-field call sites in this module (e.g. seedSamplePage above).
                const res = await PageService.updatePage({ id: page.id, data: { dataBinding: dataBinding as any } });
                toast().success(t('cms.pages.dataBinding.saved'));
                return res;
            } catch (err: any) {
                toast().danger(t('cms.pages.dataBinding.saveFailed'), err?.message);
                throw err;
            }
        },
    });

    return (
        <Formlog
            id="PageDataBindingModal"
            title={t('cms.pages.dataBinding.title')}
            submitLabel={t('cms.pages.dataBinding.saveButton')}
            isOpen={props.isOpen}
            modalType="dialog"
            position="center"
            class="w-full sm:w-[760px] shadow-2xl rounded-xl overflow-hidden"
            bodyClass="p-0"
            initialValues={{
                contentTypeId: props.page?.dataBinding?.contentTypeId,
                genericFilters: props.page?.dataBinding?.genericFilters || [],
            }}
            onClose={props.onClose}
            onSubmitted={() => props.onSaved?.()}
        >
            <div class="col-span-full grid grid-cols-12 gap-x-4 gap-y-4 p-5 sm:p-6">
                <p class="col-span-12 text-xs text-neutral-400">{t('cms.pages.dataBinding.hint')}</p>
                <div class="col-span-12">
                    <Field name="contentTypeId" label={t('cms.pages.dataBinding.contentType')} required>
                        <Select options={contentTypeOptions()} clearable />
                    </Field>
                </div>
                <div class="col-span-12">
                    <PageDataBindingFilters contentTypesFull={contentTypesFull()} />
                </div>
            </div>
        </Formlog>
    );
}

/** Reads the currently-selected `contentTypeId` reactively from the enclosing `<Formlog>` (via
 * `useForm().value()`, NOT a prop) to compute `GenericFilterListInput`'s `fieldOptions` — same
 * wiring as builder/ContentTab.tsx's `ContentDetailDataSourceFields`/`DataSourceFields`; a prop
 * would go stale the instant the admin changes the Content Type dropdown. */
function PageDataBindingFilters(props: { contentTypesFull: ContentTypeDTO[] }) {
    const { value } = useForm();
    const selectedContentTypeId = () => value?.('contentTypeId' as any) as string | undefined;
    const fieldOptions = () => {
        const ct = props.contentTypesFull.find((c) => c.id === selectedContentTypeId());
        return (ct?.fields || [])
            .filter((f): f is NonNullable<typeof f> => !!f?.key)
            .map((f) => ({ value: f.key!, label: f.label || f.key! }));
    };

    return (
        <Show
            when={selectedContentTypeId()}
            fallback={<p class="text-xs text-neutral-400">{t('cms.pages.dataBinding.noContentType')}</p>}
        >
            <Field name="genericFilters" label={t('cms.pages.dataBinding.filters')} description={t('cms.pages.dataBinding.filtersHint')}>
                <GenericFilterListInput fieldOptions={fieldOptions()} />
            </Field>
        </Show>
    );
}
