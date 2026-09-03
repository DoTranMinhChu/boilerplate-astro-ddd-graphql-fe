// Wraps <Select> with an inline "quick create" [+] dialog, without touching Select.tsx.
// Tracks the user's search text by intercepting optionsQuery's args.input.search (Select
// has no onInputTextChange) — updates only after Select's own 350ms debounce; that's fine
// since users pause typing before clicking [+]. See QuickCreateConfig<TCreate,TResult> below.

import { createSignal, JSX, Show, splitProps } from 'solid-js';
import { Select, SelectProps } from '@core/components/control/Select';
import { generateFormlog } from '@core/components/dialog/Formlog';
import { FieldProps } from '@core/components/form/Field';
import { useField } from '@core/components/form/FieldContext';
import { generateId } from '@core/helpers/util';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Cấu hình tính năng tạo nhanh.
 *
 * @template TCreate  — shape của form values (thường là CreateXxxInput)
 * @template TResult  — kiểu entity trả về từ onSubmit (thường là XxxDTO)
 *
 * @example
 * ```tsx
 * quickCreate={{
 *   title: 'Tạo nhanh thành viên',
 *   submitLabel: 'Tạo thành viên',
 *   renderForm: (Field, inputText) => (
 *     <>
 *       <div class="col-span-12 sm:col-span-7">
 *         <Field name="fullName" label="Họ và tên" required>
 *           <Input placeholder="Nguyễn Văn A" />
 *         </Field>
 *       </div>
 *       <div class="col-span-12 sm:col-span-5">
 *         <Field name="phone" label="Số điện thoại">
 *           <Input placeholder="09xxxx" />
 *         </Field>
 *       </div>
 *     </>
 *   ),
 *   onSubmit: (data) => ProductionMemberService.createProductionMember({ data }),
 *   toOption: (m) => ({ label: m.fullName, value: m.id! }),
 *   initialValues: (text) => ({ fullName: text ?? '' }),
 * }}
 * ```
 */
export interface QuickCreateConfig<TCreate extends object, TResult> {
    /** Tiêu đề dialog */
    title: string;

    /** Nhãn nút submit. Mặc định: "Tạo mới" */
    submitLabel?: string;

    /**
     * Tooltip của nút [+].
     * Mặc định: "Tạo nhanh"
     */
    triggerLabel?: string;

    /**
     * Render form fields bên trong dialog.
     * `Field` đã bound với TCreate — có type-safe name, validation, submit state.
     * `inputText` là chuỗi user đang gõ trong Select → dùng để prefill.
     *
     * Wrap mỗi field vào `<div class="col-span-12 sm:col-span-6">` để responsive.
     */
    renderForm: (
        Field: (props: FieldProps<TCreate>) => JSX.Element,
        inputText?: string,
    ) => JSX.Element;

    /**
     * Hàm async gọi API tạo mới.
     * Ném lỗi nếu thất bại → dialog giữ nguyên.
     */
    onSubmit: (data: TCreate) => Promise<TResult>;

    /**
     * Chuyển entity vừa tạo → option để auto-select.
     * Trả về `null` nếu không muốn auto-select.
     */
    toOption: (result: TResult) => { label: string; value: string } | null;

    /**
     * Initial values của form khi dialog mở.
     * - Object: dùng trực tiếp
     * - Hàm `(inputText?) => TCreate`: gọi với inputText hiện tại → prefill tên
     */
    initialValues?: TCreate | ((inputText?: string) => TCreate);
}

export interface SelectWithCreateProps<
    OptionType = any,
    ItemType = any,
    TCreate extends object = any,
    TResult = any,
> extends SelectProps<OptionType, ItemType> {
    /**
     * Khi truyền vào: nút [+] xuất hiện, click mở dialog tạo nhanh.
     * Khi không truyền: hoạt động y hệt `<Select>` bình thường.
     */
    quickCreate?: QuickCreateConfig<TCreate, TResult>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SelectWithCreate<
    OptionType = any,
    ItemType = any,
    TCreate extends object = any,
    TResult = any,
>(allProps: SelectWithCreateProps<OptionType, ItemType, TCreate, TResult>) {
    // Tách quickCreate ra khỏi props → phần còn lại pass thẳng vào Select
    const [own, selectProps] = splitProps(allProps, ['quickCreate']);
    const qc = () => own.quickCreate;

    // Lưu text user đang gõ trong Select → prefill form khi mở dialog
    const [inputText, setInputText] = createSignal('');

    // Tăng trigger → Select re-fetch optionsQuery sau khi tạo item mới
    const [refreshTrigger, setRefreshTrigger] = createSignal(0);

    // Field context — dùng để setValue khi không có onChange prop trực tiếp
    const field = useField();

    // Trạng thái mở/đóng dialog tạo nhanh
    const [dialogOpen, setDialogOpen] = createSignal(false);

    // Nút [+] chỉ hiện khi có quickCreate và không bị readOnly/disabled
    const showCreateBtn = () =>
        !!qc() && !allProps.readOnly && !allProps.disabled;

    // Patch optionsQuery:
    //   1. Thêm trigger để force re-fetch sau khi tạo item mới
    //   2. Wrap query để intercept search text → lưu vào inputText cho dialog prefill
    //      (Select không expose onInputTextChange ra ngoài, nhưng gọi query với search
    //       → ta intercept search string từ đây)
    const patchedOptionsQuery = () => {
        const oq = allProps.optionsQuery;
        if (!oq) return undefined;
        return {
            ...oq,
            trigger: refreshTrigger(),
            // Wrap query để intercept search text
            query: (args: { input: any }) => {
                // args.input.search là text user đang gõ (sau debounce)
                if (args.input?.search !== undefined) {
                    setInputText(args.input.search ?? '');
                }
                return oq.query(args);
            },
        };
    };

    // Tính initialValues tại thời điểm dialog mở (không tính lại sau đó)
    const getInitialValues = (): TCreate | undefined => {
        const cfg = qc();
        if (!cfg?.initialValues) return undefined;
        if (typeof cfg.initialValues === 'function') {
            return (cfg.initialValues as (t?: string) => TCreate)(inputText());
        }
        return cfg.initialValues;
    };

    // Callback sau khi tạo thành công
    const handleCreated = (result: TResult) => {
        const cfg = qc();
        if (!cfg) return;

        // Auto-select item vừa tạo
        const option = cfg.toOption(result);
        if (option) {
            if (allProps.onChange) {
                // Controlled mode: onChange prop trực tiếp
                const onChange = allProps.onChange as (v: any) => void;
                if (allProps.multi) {
                    const cur = allProps.value;
                    const arr = Array.isArray(cur) ? [...(cur as any[])] : cur ? [cur] : [];
                    onChange([...arr, option.value] as any);
                } else {
                    onChange(option.value as any);
                }
            } else if (field?.setValue) {
                // Field context mode: dùng khi SelectWithCreate nằm trong <Field>
                if (allProps.multi) {
                    const cur = field.value?.();
                    const arr = Array.isArray(cur) ? [...(cur as any[])] : cur ? [cur] : [];
                    field.setValue([...arr, option.value]);
                } else {
                    field.setValue(option.value);
                }
            }
        }

        // Force dropdown re-fetch để item mới xuất hiện trong list
        setRefreshTrigger(t => t + 1);
        setDialogOpen(false);
    };

    return (
        <>
            {/*
             * Layout: giống hệt cấu trúc Select gốc
             *   <div class="flex gap-2">
             *     <InputWrapper ...>   ← Select tự render
             *     <Show when={hasRefresh}>...</Show>
             *     <Show when={showCreateBtn}>...</Show>  ← thêm mới
             *   </div>
             *
             * Không bọc thêm div quanh Select → Field context vẫn flow đúng.
             * Dùng fragment + class trên Select để nút [+] nằm ngang hàng.
             */}
            <div class="flex items-center gap-1.5 w-full">

                {/* ── Select chiếm hết width còn lại ── */}
                <div class="flex-1 min-w-0">
                    <Select<OptionType, ItemType>
                        {...(selectProps as SelectProps<OptionType, ItemType>)}
                        optionsQuery={patchedOptionsQuery()}
                    />
                </div>

                {/* ── Nút [+] tạo nhanh ── */}
                <Show when={showCreateBtn()}>
                    <button
                        type="button"
                        title={qc()?.triggerLabel ?? 'Tạo nhanh'}
                        aria-label={qc()?.triggerLabel ?? 'Tạo nhanh'}
                        onClick={() => setDialogOpen(true)}
                        class={[
                            'shrink-0 w-9 h-9 rounded-xl',
                            'border-2 border-dashed border-emerald-300',
                            'bg-emerald-50 text-emerald-600',
                            'font-bold text-lg leading-none',
                            'flex items-center justify-center',
                            'transition-all duration-150',
                            'hover:bg-emerald-100 hover:border-emerald-500 hover:scale-105',
                            'active:scale-95',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                            // Tap target đủ lớn trên mobile (min 44×44 — già đủ 36px w-9 h-9)
                            'touch-manipulation',
                        ].join(' ')}
                    >
                        +
                    </button>
                </Show>

            </div>

            {/* ── Dialog tạo nhanh — render ngoài flow để tránh clipping ── */}
            <Show when={dialogOpen() && !!qc()}>
                <InlineCreateDialog
                    config={qc()!}
                    initialValues={getInitialValues()}
                    inputText={inputText()}
                    onClose={() => setDialogOpen(false)}
                    onCreated={handleCreated}
                />
            </Show>
        </>
    );
}

// ── InlineCreateDialog ────────────────────────────────────────────────────────
//
// Dialog tạo nhanh — dùng generateFormlog từ core.
//
// Tại sao generateFormlog thay vì Formlog trực tiếp?
//   generateFormlog trả về Formlog.Field đã bound với TCreate
//   → type-safe name, validation, submit state — giống hệt Datatable.Field
//   → truyền Formlog.Field ra ngoài qua renderForm(Field, inputText)
//   → dev dùng giống hệt Datatable.Field bình thường

interface InlineCreateDialogProps<TCreate extends object, TResult> {
    config: QuickCreateConfig<TCreate, TResult>;
    initialValues?: TCreate;
    inputText?: string;
    onClose: () => void;
    onCreated: (result: TResult) => void;
}

function InlineCreateDialog<TCreate extends object, TResult>(
    props: InlineCreateDialogProps<TCreate, TResult>,
) {
    // id bắt buộc bởi ModalOptions (Modal.tsx) — generate 1 lần khi dialog mount
    const dialogId = generateId();

    // generateFormlog<TCreate, TResult> → Formlog.Field bound với TCreate
    const { Formlog } = generateFormlog<TCreate, TResult>({
        handleSubmit: async (data) => {
            // Lỗi sẽ được Formlog bắt → giữ form mở, hiện lỗi
            return await props.config.onSubmit(data);
        },
    });

    return (
        <Formlog
            id={dialogId}
            title={props.config.title}
            submitLabel={props.config.submitLabel ?? 'Tạo mới'}
            isOpen
            onClose={props.onClose}
            initialValues={props.initialValues ?? undefined}
            modalType="dialog"
            mode="sub"
            class="w-full sm:w-[500px]"
            onSubmitted={(_values, result) => {
                props.onCreated(result);
            }}
        >
            {/*
             * Body: grid 12 cột.
             * col-span-full bắt buộc vì Formlog dùng <Fieldset> (grid 12 cột).
             * p-4 sm:p-5: padding thoải mái trên iPhone 14 (390px).
             */}
            <div class="col-span-full grid grid-cols-12 gap-x-4 gap-y-3 p-4 sm:p-5">

                {/* Badge hiển thị text đang gõ — gợi nhớ ngữ cảnh */}
                <Show when={props.inputText?.trim()}>
                    <div class="col-span-12 flex items-center gap-2 px-3 py-2
                                bg-emerald-50 border border-emerald-200 rounded-xl
                                text-xs text-emerald-700">
                        <span class="text-base leading-none">⚡</span>
                        <span>
                            Tạo nhanh từ: <strong class="font-semibold">"{props.inputText}"</strong>
                        </span>
                    </div>
                </Show>

                {/*
                 * renderForm(Field, inputText):
                 *   Field = Formlog.Field — type-safe với TCreate
                 *   inputText = text user đã gõ → dev có thể dùng để prefill
                 *
                 * Dev render như bình thường:
                 *   renderForm: (Field) => (
                 *     <div class="col-span-12 sm:col-span-6">
                 *       <Field name="fullName" label="Họ và tên" required>
                 *         <Input />
                 *       </Field>
                 *     </div>
                 *   )
                 */}
                {props.config.renderForm(Formlog.Field as any, props.inputText)}

            </div>
        </Formlog>
    );
}