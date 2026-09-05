import { baseConfig } from '@core/components/config/BaseConfig';
import { Formlog, FormlogProps } from '@core/components/dialog/Formlog';
import { createMemo, Show } from 'solid-js';
import { toast } from '../toast/ToastProvider';
import { Spinner } from '../utilities/Spinner';
import { useDatatable } from './DatatableContext';
import { mediaSetResolverRegistry } from '@core/components/control/InputMedia';
import { Util } from '@core/helpers/util';
import { mergeClass } from '@core/helpers/class';

export interface DatatableFormlogProps<
  ItemType,
  FormValuesCreate extends object,
  FormValuesUpdate extends object,
> extends Omit<
  FormlogProps<FormValuesCreate & FormValuesUpdate, ItemType>,
  'id' | 'transformValues' | 'onSubmitted' | 'isOpen' | 'onClose'
> {
  // ✅ Option mới: Chọn kiểu hiển thị
  viewMode?: 'drawer' | 'modal';
  createTitle?: string;
  updateTitle?: string;
  createSubmitLabel?: string;
  updateSubmitLabel?: string;
  createMutation?: (data: FormValuesCreate) => Promise<ItemType | undefined | null>;
  updateMutation?: (
    id: string,
    data: FormValuesUpdate,
  ) => Promise<ItemType | undefined | null>;
  transformCreateInitialValues?: () => FormValuesCreate;
  transformUpdateInitialValues?: (values: ItemType) => FormValuesUpdate;
  transformValues?: (
    values: FormValuesCreate & FormValuesUpdate,
    item: null | ItemType,
  ) => FormValuesCreate & FormValuesUpdate;
  onSubmitted?: (
    values: FormValuesCreate & FormValuesUpdate,
    result: ItemType,
    item: null | ItemType,
  ) => any;
  onCreated?: (values: FormValuesCreate, result: ItemType) => any;
  onUpdated?: (
    values: FormValuesUpdate,
    result: ItemType,
    item: ItemType,
  ) => any;
  onClose?: () => any;
  children: (item: undefined | null | ItemType) => JSX.Element;
}
export function DatatableFormlog<
  ItemType,
  FormValuesCreate extends object,
  FormValuesUpdate extends object,
>(props: DatatableFormlogProps<ItemType, FormValuesCreate, FormValuesUpdate>) {
  const {
    id,
    service,
    isFormlogOpen,
    setIsFormlogOpen,
    formlogItem,
    setFormlogItem,
    isFormlogReadOnly,
    setIsFormlogReadOnly,
    refresh,
  } = useDatatable();

  const title = () => {
    if (isFormlogReadOnly()) return props.title || `Xem ${service.displayName}`;
    return (
      (formlogItem() ? props.updateTitle : props.createTitle) ||
      props.title ||
      `${formlogItem() ? baseConfig().datatableUpdateLabel : baseConfig().datatableCreateLabel} ${service.displayName}`
    );
  };
  const submitLabel = () => {
    if (isFormlogReadOnly()) return undefined;
    return (
      (formlogItem() ? props.updateSubmitLabel : props.createSubmitLabel) ||
      props.submitLabel ||
      `${formlogItem() ? baseConfig().datatableUpdateLabel : baseConfig().datatableCreateLabel} ${service.displayName}`
    );
  };

  const resolveMediaSets = async (values: any): Promise<any> => {
    if (mediaSetResolverRegistry.size === 0) return values;
    let resolved = { ...values };
    for (const [fieldName, resolveFn] of mediaSetResolverRegistry) {
      const setId = await resolveFn();
      if (setId !== undefined) {
        resolved = Util.set(resolved, fieldName as any, setId);
      }
    }
    return resolved;
  };

  const handleSubmit = async (values: FormValuesCreate & FormValuesUpdate) => {
    const resolvedValues = await resolveMediaSets(values) as FormValuesCreate & FormValuesUpdate;
    const item = formlogItem();
    if (item) {
      if (props.updateMutation) {
        try {
          const res = await props.updateMutation(
            item.id,
            resolvedValues as FormValuesUpdate,
          );
          toast().success(
            baseConfig().taskSuccessText(submitLabel() as string),
          );
          await refresh();
          setFormlogItem();
          setIsFormlogOpen();
          return res;
        } catch (err) {
          toast().danger(baseConfig().taskFailureText(submitLabel() as string));
          throw err;
        }
      }
    } else {
      if (props.createMutation) {
        try {
          const res = await props.createMutation(resolvedValues as FormValuesCreate);
          toast().success(
            baseConfig().taskSuccessText(submitLabel() as string),
          );
          await refresh();
          setFormlogItem();
          setIsFormlogOpen();
          return res;
        } catch (err) {
          toast().danger(baseConfig().taskFailureText(submitLabel() as string));
          throw err;
        }
      }
    }
  };
  // ✅ Fix logic settings để Modal có chiều rộng
  const getModalSettings = () => {
    if (props.viewMode === 'modal') {
      return {
        modalType: 'dialog' as const,
        position: 'center' as const,
        // Dùng các props size của Core Modal
        // md: true, // Chiều rộng trung bình (768px) - bạn có thể đổi thành lg nếu muốn rộng hơn
        class: 'shadow-2xl rounded-xl overflow-hidden',
        bodyClass: 'p-0', // Xóa padding mặc định để grid tự xử lý
      };
    }
    return {
      modalType: 'slideout' as const,
      position: 'right' as const,
      class: 'h-full shadow-2xl',
    };
  };
  // Drawer-reactivity fix (follow-up review, Task 19): `getModalSettings()` reads
  // `props.viewMode`, which callers can bind to a LIVE signal (e.g.
  // manageContentEntries.page.tsx's `formlogMode()`) that changes after this
  // component's own first render — a plain `const settings = getModalSettings()`
  // (as this used to be) computes it exactly ONCE at setup and never re-reads it,
  // so `settings.modalType`/`settings.class` stayed frozen to whatever `viewMode`
  // was on mount. `createMemo` is safe here (unlike the two spots fixed in
  // Formlog.tsx) because `getModalSettings()` only returns plain data — a `{
  // modalType, position, class, bodyClass? }` object, never a component reference —
  // so there is no compound-component "can't `.Header`-off-a-memo" hazard to work
  // around; a reactive read of a value that never changes (every other ~19
  // consumer passes a static `viewMode` literal) behaves identically to the old
  // non-reactive read, so this is a no-op for them.
  const settings = createMemo(() => getModalSettings());
  return (

    <Formlog

      title={title()}
      submitLabel={submitLabel()}
      handleSubmit={handleSubmit}
      {...props}
      id={`${id}Formlog`}
      initialValues={
        formlogItem()
          ? props.transformUpdateInitialValues
            ? props.transformUpdateInitialValues(formlogItem())
            : formlogItem()
          : props.transformCreateInitialValues
            ? props.transformCreateInitialValues()
            : null
      }
      isOpen={isFormlogOpen()}
      onClose={() => {
        setIsFormlogOpen(false);
        setFormlogItem();
        setIsFormlogReadOnly(false);
        props.onClose?.();
      }}
      // BUG THẬT (Task 19, phát hiện qua live click-through): trước đây chỉ `position` được áp
      // dụng — `modalType` (quyết định render <Dialog> hay <Slideout>, xem Formlog.tsx dòng 75
      // `props.modalType || 'dialog'`) và `class` (kích thước/style riêng theo từng chế độ) đều
      // BỊ RỚT hoàn toàn (dòng `class=...` cũ nằm trong comment, `modalType` chưa từng được
      // truyền ở đây) — Formlog LUÔN mặc định `modalType='dialog'` bất kể `viewMode` gọi vào là
      // gì. Hậu quả kép: (1) chế độ "Chỉnh sửa dạng Drawer" (Content Entry, Task 12) thật ra
      // luôn mở y hệt Quick Dialog, chưa từng thật sự trượt từ phải như thiết kế; (2) cơ chế
      // responsive "modal tự đổi thành drawer trên mobile" (GeneratedDatatable.tsx's
      // `resolvedViewMode`, áp dụng cho MỌI trang dùng `Datatable.Formlog`, không riêng Content
      // Entry) cũng chưa từng hoạt động — mọi form trên mobile vẫn hiện dialog giữa màn hình.
      // Xác nhận qua DOM: panel render ra `my-auto ... max-w-[640px]` (class của nhánh 'modal')
      // ngay cả khi `viewMode='drawer'`. Sửa: truyền cả `modalType` lẫn `class` (merge với
      // `props.class` của caller, không ghi đè) — đặt SAU `{...props}` để override đúng như
      // `position` đã làm.
      // Follow-up review (Task 19): the fix above was still incomplete on its own — `settings`
      // must be READ THROUGH THE ACCESSOR (`settings()`, not `settings.foo`) for the memo to
      // actually re-run when `props.viewMode` changes later; a leftover `settings.modalType`
      // property-read here would silently defeat the createMemo() above.
      modalType={settings().modalType}
      position={settings().position}
      class={mergeClass(settings().class, props.class)}

      transformValues={
        props.transformValues
          ? (values) => {
            return props.transformValues!(values, formlogItem());
          }
          : undefined
      }
      onSubmitted={(values, result) => {
        const item = formlogItem();
        props.onSubmitted?.(values, result, item);
        if (item) {
          props.onUpdated?.(values as FormValuesUpdate, result, item);
        } else {
          props.onCreated?.(values as FormValuesCreate, result);
        }
      }}
    >
      <Show when={formlogItem() !== undefined} fallback={<Spinner />}>
        <Show
          when={isFormlogReadOnly()}
          fallback={props.children(formlogItem())}
        >
          {/* View-only: block form controls nhưng cho phép accordion expand và lightbox ảnh */}
          <div
            class="col-span-full grid grid-cols-12
              [&_input]:pointer-events-none [&_input]:select-none [&_input]:cursor-default [&_input]:bg-slate-50
              [&_textarea]:pointer-events-none [&_textarea]:select-none [&_textarea]:cursor-default [&_textarea]:bg-slate-50
              [&_select]:pointer-events-none [&_select]:cursor-default"
          >
            {props.children(formlogItem())}
          </div>


        </Show>
      </Show>
    </Formlog>

  );
}
