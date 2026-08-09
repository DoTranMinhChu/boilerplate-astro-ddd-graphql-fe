import { Accessor, Show, createEffect, createMemo, createResource, createSignal } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { generateFormlog } from '@core/components/dialog/Formlog';
import { useForm } from '@core/components/form/FormContext';
import type { FieldProps } from '@core/components/form/Field';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { DragList, DragHandle } from './DragList';
import { TermDTO, TermService } from '@/shared/services/term/term.service';
import type { CreateTermInput, UpdateTermInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { t } from '@/shared/i18n/t';

// ── slugify tiếng Việt — bản rút gọn mirror ddd-graphql-be/src/core/shared/utils/slug.util.ts,
// CHỈ dùng để preview trực tiếp trên UI khi admin gõ Label. BE luôn tự chuẩn hoá lại slug thật
// khi lưu (TermService.createTerm/updateTerm phía BE luôn chạy slugify() trên giá trị gửi lên),
// nên sai khác nhỏ ở đây (nếu có) không ảnh hưởng dữ liệu thật.
const VN_CHAR_MAP: Record<string, string> = {
    à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a', â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a',
    è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e', ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e',
    ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
    ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o', ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o',
    ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u',
    ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
    đ: 'd',
};
function slugifyPreview(input: string): string {
    const lower = (input || '').toLowerCase();
    const replaced = lower.replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, (c) => VN_CHAR_MAP[c] ?? c);
    return replaced
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export interface TermTreeEditorProps {
    taxonomyId: string;
    hierarchical: boolean;
}

/** Quản lý Term của 1 Taxonomy — cây (parentId) nếu hierarchical, danh sách phẳng nếu không.
 *
 * Quyết định thiết kế (xem báo cáo Task 4): kéo-thả (DragList/@thisbeyond/solid-dnd, y hệt
 * FieldDefinitionArrayInput) chỉ dùng để ĐỔI THỨ TỰ (order) trong cùng 1 nhóm cha — mỗi cấp
 * cha render 1 <DragList> riêng (đệ quy qua TermGroup). Đổi CHA (parentId) dùng Select "Term
 * cha" trong dialog sửa từng Term thay vì kéo-thả xuyên cấp: kéo 1 item xuyên nhiều
 * <DragDropProvider> lồng nhau (mỗi cấp/nhóm là 1 provider độc lập) để "thả vào giữa danh sách
 * con của term khác" đòi hỏi tự dò va chạm liên-provider + tự validate không tạo vòng lặp ngay
 * lúc kéo — độ phức tạp không tương xứng với 1 thao tác admin làm không thường xuyên, trong khi
 * Select có sẵn validation (loại trừ chính nó + hậu duệ) và báo lỗi rõ ràng nếu lỡ chọn sai.
 */
export function TermTreeEditor(props: TermTreeEditorProps) {
    const [termsResource, { refetch }] = createResource(
        () => props.taxonomyId,
        (taxonomyId) => TermService.getAllTerm({ input: { filter: { taxonomyId } as any, limit: 500 } }),
    );

    const [localTerms, setLocalTerms] = createSignal<TermDTO[]>([]);
    createEffect(() => {
        const edges = (termsResource()?.edges || []) as Edge<TermDTO>[];
        setLocalTerms(
            edges
                .filter((e): e is Edge<TermDTO> & { node: TermDTO } => !!e?.node)
                .map((e) => e.node),
        );
    });

    const [dialogState, setDialogState] = createSignal<{ item?: TermDTO; parentId?: string } | null>(null);

    const persistOrder = async (updates: { id: string; order: number }[]) => {
        try {
            await Promise.all(updates.map((u) => TermService.updateTerm({ id: u.id, data: { order: u.order } })));
        } catch (err: any) {
            toast().danger(t('cms.taxonomies.terms.reorderFailed'), err?.message);
            refetch();
        }
    };

    // Mutate `order` TẠI CHỖ trên chính các object đang sống trong localTerms() rồi chỉ đổi
    // reference của MẢNG NGOÀI (không tạo object item mới) — DragList's stableKey() tra theo
    // reference object (xem DragList.tsx), tạo item mới ở đây sẽ khiến cả nhóm bị unmount/
    // remount sau mỗi lần kéo-thả (mất animation, giật UI). Cùng lý do FieldDefinitionArrayInput
    // dùng Object.assign thay vì spread khi cập nhật 1 field.
    const handleReorderGroup = (_parentId: string | undefined, next: TermDTO[]) => {
        next.forEach((term, idx) => { term.order = idx; });
        setLocalTerms((all) => [...all]);
        persistOrder(next.map((term, idx) => ({ id: term.id!, order: idx })));
    };

    const handleDelete = async (item: TermDTO) => {
        const res = await confirmAction().danger(() => t('cms.taxonomies.terms.deleteConfirmTitle'), {
            content: () => t('cms.taxonomies.terms.deleteConfirmContent', { label: item.label || '' }),
            submitLabel: t('cms.taxonomies.terms.deleteConfirmSubmitLabel'),
            position: 'right',
        });
        if (!res) return;
        try {
            await TermService.deleteTerm({ id: item.id! });
            toast().success(t('cms.toasts.saved'));
            refetch();
        } catch (err: any) {
            toast().danger(t('cms.taxonomies.terms.deleteFailed'), err?.message);
        }
    };

    const rootCount = createMemo(() => localTerms().filter((term) => !term.parentId).length);

    return (
        <Card class="border-none shadow-sm">
            <div class="p-5 sm:p-6 space-y-5">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-sm text-neutral-400 max-w-2xl">
                        {props.hierarchical ? t('cms.taxonomies.terms.descriptionTree') : t('cms.taxonomies.terms.descriptionFlat')}
                    </p>
                    <Button
                        sm
                        solid
                        icon={<Icon name="heroicons-outline:plus" />}
                        label={t('cms.taxonomies.terms.addButton')}
                        onClick={() => setDialogState({})}
                    />
                </div>

                <Show
                    when={!termsResource.loading}
                    fallback={<div class="py-10 text-center text-sm text-neutral-400">{t('cms.taxonomies.terms.loading')}</div>}
                >
                    <Show
                        when={rootCount() > 0}
                        fallback={
                            <div class="py-10 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                                {t('cms.taxonomies.terms.emptyState')}
                            </div>
                        }
                    >
                        <TermGroup
                            parentId={undefined}
                            depth={0}
                            allTerms={localTerms}
                            hierarchical={props.hierarchical}
                            onReorder={handleReorderGroup}
                            onEdit={(item) => setDialogState({ item })}
                            onDelete={handleDelete}
                            onAddChild={(parentId) => setDialogState({ parentId })}
                        />
                    </Show>
                </Show>
            </div>

            {/* LUÔN mount TermFormDialog (không bọc <Show>) — chỉ đổi cờ isOpen. `Modal` (bên
              trong Formlog/generateFormlog) chỉ gọi closeModal() dọn backdrop khỏi portal
              global thông qua 1 createEffect lắng nghe props.isOpen chuyển true → false; unmount
              đột ngột cả cây (Show mount/unmount như thử ban đầu) khiến effect đó không bao giờ
              chạy lại với isOpen=false, để lại backdrop mờ toàn màn hình chặn hết click — bug này
              lộ ra ngay ở QA thủ công (xem báo cáo Task 4). */}
            <TermFormDialog
                taxonomyId={props.taxonomyId}
                hierarchical={props.hierarchical}
                allTerms={localTerms()}
                isOpen={dialogState() !== null}
                item={dialogState()?.item}
                defaultParentId={dialogState()?.parentId}
                onClose={() => setDialogState(null)}
                onSaved={() => { setDialogState(null); refetch(); }}
            />
        </Card>
    );
}

// ── TermGroup: render 1 nhóm anh em (cùng parentId) qua DragList — đệ quy render nhóm con
// của mỗi term khi hierarchical, thụt lề theo depth. ─────────────────────────────────────
function TermGroup(props: {
    parentId: string | undefined;
    depth: number;
    allTerms: Accessor<TermDTO[]>;
    hierarchical: boolean;
    onReorder: (parentId: string | undefined, next: TermDTO[]) => void;
    onEdit: (item: TermDTO) => void;
    onDelete: (item: TermDTO) => void;
    onAddChild: (parentId: string) => void;
}) {
    const siblings = createMemo(() =>
        props.allTerms()
            .filter((term) => (term.parentId || undefined) === props.parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    );

    return (
        <DragList items={siblings()} onReorder={(next) => props.onReorder(props.parentId, next)} class="space-y-2">
            {(term) => (
                <div>
                    <div
                        class="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                        style={{ 'margin-left': `${props.depth * 1.75}rem` }}
                    >
                        <DragHandle />
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-neutral-900 truncate">{term.label}</p>
                            <code class="text-xs text-neutral-400">{term.slug}</code>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <Show when={props.hierarchical}>
                                <Button
                                    sm
                                    outline
                                    icon={<Icon name="heroicons-outline:plus" tooltip={t('cms.taxonomies.terms.addChildButton')} />}
                                    onClick={() => props.onAddChild(term.id!)}
                                />
                            </Show>
                            <Button
                                sm
                                outline
                                icon={<Icon name="heroicons-outline:pencil-square" tooltip={t('cms.taxonomies.terms.editHint')} />}
                                onClick={() => props.onEdit(term)}
                            />
                            <Button
                                sm
                                outline
                                interactDanger
                                icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.taxonomies.terms.deleteHint')} />}
                                onClick={() => props.onDelete(term)}
                            />
                        </div>
                    </div>
                    <Show when={props.hierarchical}>
                        <div class="mt-2 space-y-2">
                            <TermGroup
                                parentId={term.id}
                                depth={props.depth + 1}
                                allTerms={props.allTerms}
                                hierarchical={props.hierarchical}
                                onReorder={props.onReorder}
                                onEdit={props.onEdit}
                                onDelete={props.onDelete}
                                onAddChild={props.onAddChild}
                            />
                        </div>
                    </Show>
                </div>
            )}
        </DragList>
    );
}

// ── TermFormDialog: tạo/sửa 1 Term — Label, Slug (auto-slugify tới khi sửa tay), và (nếu
// hierarchical) Select "Term cha" — xem rationale ở JSDoc của TermTreeEditor phía trên. ────
function TermFormDialog(props: {
    taxonomyId: string;
    hierarchical: boolean;
    allTerms: TermDTO[];
    isOpen: boolean;
    item?: TermDTO;
    defaultParentId?: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    // Hàm, KHÔNG phải const boolean — component này giờ mount VĨNH VIỄN (xem comment ở call site
    // trong TermTreeEditor), tái dùng cho mọi lượt mở (tạo lẫn sửa), nên phải đọc props.item MỚI
    // NHẤT tại thời điểm dùng (submit/render) thay vì chốt cứng 1 lần lúc mount.
    const isUpdate = () => !!props.item;

    // Loại trừ chính term đang sửa + toàn bộ hậu duệ của nó khỏi lựa chọn "Term cha" — tránh
    // admin tự tạo vòng lặp cha/con qua UI (BE cũng chặn ở assertNoCycle, lọc trước ở đây đỡ
    // phải chờ round-trip báo lỗi cho 1 lựa chọn vốn dĩ vô nghĩa).
    const excludedIds = createMemo(() => {
        const selfId = props.item?.id;
        if (!selfId) return new Set<string>();
        const ids = new Set<string>([selfId]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const term of props.allTerms) {
                if (term.id && term.parentId && ids.has(term.parentId) && !ids.has(term.id)) {
                    ids.add(term.id);
                    changed = true;
                }
            }
        }
        return ids;
    });

    const parentOptions = createMemo(() => {
        const excluded = excludedIds();
        const byParent = (parentId: string | undefined) =>
            props.allTerms
                .filter((term) => (term.parentId || undefined) === parentId && !excluded.has(term.id!))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const options: { value: string; label: string }[] = [];
        const walk = (parentId: string | undefined, depth: number) => {
            byParent(parentId).forEach((term) => {
                options.push({ value: term.id!, label: `${'—'.repeat(depth)}${depth ? ' ' : ''}${term.label}` });
                walk(term.id, depth + 1);
            });
        };
        walk(undefined, 0);
        return options;
    });

    const siblingCount = (parentId: string | undefined) =>
        props.allTerms.filter((term) => (term.parentId || undefined) === parentId).length;

    const { Formlog } = generateFormlog<Record<string, any>, TermDTO>({
        handleSubmit: async (values) => {
            const label = (values.label as string) || '';
            const slug = ((values.slug as string) || '').trim() || undefined;
            const parentId = props.hierarchical ? ((values.parentId as string) || undefined) : undefined;
            try {
                let res: TermDTO | undefined | null;
                if (isUpdate()) {
                    const data: UpdateTermInput = { label, slug, parentId };
                    const oldParentId = props.item!.parentId || undefined;
                    // Đổi cha → đặt lại order = cuối danh sách con của nhóm cha MỚI, tránh trùng
                    // order với anh em ở nhóm cũ (mỗi nhóm cha tự đánh số order riêng từ 0).
                    if (props.hierarchical && oldParentId !== parentId) {
                        data.order = siblingCount(parentId);
                    }
                    res = await TermService.updateTerm({ id: props.item!.id!, data });
                } else {
                    const data: CreateTermInput = {
                        taxonomyId: props.taxonomyId,
                        label,
                        slug,
                        parentId,
                        order: siblingCount(parentId),
                    };
                    res = await TermService.createTerm({ data });
                }
                toast().success(t('cms.toasts.saved'));
                return res as TermDTO;
            } catch (err: any) {
                toast().danger(t('cms.taxonomies.terms.saveFailed'), err?.message);
                throw err;
            }
        },
    });

    return (
        <Formlog
            id="TermFormDialog"
            title={isUpdate() ? t('cms.taxonomies.terms.updateTitle') : t('cms.taxonomies.terms.createTitle')}
            submitLabel={isUpdate() ? t('cms.taxonomies.terms.updateTitle') : t('cms.taxonomies.terms.createTitle')}
            isOpen={props.isOpen}
            modalType="dialog"
            position="center"
            class="w-full sm:w-[520px] shadow-2xl rounded-xl overflow-hidden"
            bodyClass="p-0"
            initialValues={{
                label: props.item?.label || '',
                slug: props.item?.slug || '',
                parentId: props.item?.parentId || props.defaultParentId || '',
            }}
            onClose={props.onClose}
            onSubmitted={() => props.onSaved()}
        >
            <div class="col-span-full grid grid-cols-12 gap-x-4 gap-y-4 p-5 sm:p-6">
                <div class="col-span-12">
                    <Formlog.Field name="label" label={t('cms.taxonomies.terms.fields.label')} required>
                        <Input placeholder={t('cms.taxonomies.terms.fields.labelPlaceholder')} />
                    </Formlog.Field>
                </div>
                <div class="col-span-12">
                    <TermSlugField Field={Formlog.Field as (fieldProps: FieldProps) => JSX.Element} />
                </div>
                <Show when={props.hierarchical}>
                    <div class="col-span-12">
                        <Formlog.Field name="parentId" label={t('cms.taxonomies.terms.fields.parent')}>
                            {/* `Select` (KHÔNG phải `NativeSelect`) — NativeSelect.tsx không gọi
                              createControl()/useField() nên KHÔNG tự nối vào FieldContext của
                              <Field> bao ngoài; dùng ở "chế độ ambient" (không truyền value/
                              onChange tay) như dưới đây khiến nó luôn hiển thị rỗng VÀ không bao
                              giờ ghi lại giá trị chọn vào form — bug thật, bắt được khi QA thủ
                              công thấy "Term cha" không lưu (xem báo cáo Task 4). `Select` có gọi
                              createControl() (xem Select.tsx) nên hoạt động đúng ở chế độ ambient,
                              đúng khuôn `<Select options={STATUS_OPTIONS()} />` trong
                              manageContentEntries.page.tsx. */}
                            <Select
                                options={parentOptions()}
                                clearable
                                emptyPlaceholder={t('cms.taxonomies.terms.fields.parentNone')}
                            />
                        </Formlog.Field>
                    </div>
                </Show>
            </div>
        </Formlog>
    );
}

// Field "Slug" tự sinh từ Label tới khi admin sửa tay — theo dõi qua useForm() (Field context
// của Formlog bao ngoài) thay vì props/signal cục bộ, vì Formlog.Field đã bind data vào
// FormContext chung của dialog. `lastAutoSlug` là biến closure (không phải signal) — chỉ dùng
// để so sánh "slug hiện tại có đang khớp với lần tự sinh gần nhất hay không", không cần reactive.
function TermSlugField(props: { Field: (fieldProps: FieldProps) => JSX.Element }) {
    const { value, setValues } = useForm();
    let lastAutoSlug = (value('slug' as any) as string) || '';

    createEffect(() => {
        const label = (value('label' as any) as string) || '';
        const currentSlug = (value('slug' as any) as string) || '';
        if (currentSlug === lastAutoSlug) {
            const next = slugifyPreview(label);
            if (next !== currentSlug) {
                lastAutoSlug = next;
                setValues('slug' as any, next);
            }
        }
    });

    const Field = props.Field;
    return (
        <Field name="slug" label={t('cms.taxonomies.terms.fields.slug')} description={t('cms.taxonomies.terms.fields.slugHint')}>
            <Input placeholder="vd: tin-tuc" />
        </Field>
    );
}
