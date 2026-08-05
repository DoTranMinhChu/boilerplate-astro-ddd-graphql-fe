import { Show, createResource, createSignal } from 'solid-js';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { resolveCmsPageProps } from '@/modules/cms/api/resolveCmsPageProps';
import { SectionRenderer } from '@/modules/cms/SectionRenderer';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';

/**
 * Preview 1 trang CÒN Ở TRẠNG THÁI DRAFT (mục 13 spec CMS) — render bằng đúng
 * SectionRenderer/AnimationController mà public site dùng, chỉ khác nguồn dữ
 * liệu là `previewPageResolver` (yêu cầu đăng nhập, bỏ qua điều kiện PUBLISHED).
 * Không đi qua Astro SSR public vì route đó không có JWT của admin.
 */
export function PreviewCmsPage() {
    const { searchParams, navigate } = useRoutes();
    const path = () => (searchParams.path as string) || '/';
    const [refreshKey, setRefreshKey] = createSignal(0);

    const [props] = createResource(() => `${path()}::${refreshKey()}`, () => resolveCmsPageProps(path(), { preview: true }));

    return (
        <div class="min-h-screen bg-white">
            <div class="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
                <div class="flex items-center gap-2 font-semibold text-amber-800">
                    <Icon name="heroicons-outline:eye" class="h-4 w-4" />
                    {t('cms.builder.draftBadge')} — <code class="rounded bg-amber-100 px-1.5 py-0.5">{path()}</code>
                </div>
                <div class="flex items-center gap-2">
                    <Button sm outline onClick={() => setRefreshKey((k) => k + 1)}>{t('cms.builder.reloadButton')}</Button>
                    <Button sm onClick={() => navigate(-1)}>{t('cms.builder.closeButton')}</Button>
                </div>
            </div>

            <Show when={!props.loading} fallback={<div class="p-10 text-center text-neutral-400">{t('common.loading')}</div>}>
                <Show
                    when={props()}
                    fallback={
                        <div class="p-10 text-center">
                            <p class="text-lg font-semibold text-neutral-700">{t('common.noData')}</p>
                        </div>
                    }
                >
                    {(p) => (
                        <Show
                            when={p().sections.length > 0}
                            fallback={
                                <div class="p-10 text-center">
                                    <p class="text-lg font-semibold text-neutral-700">{t('cms.pages.emptyPageNoSections')}</p>
                                </div>
                            }
                        >
                            <SectionRenderer sections={p().sections} pageEntry={p().pageEntry} contentTypeFields={p().contentTypeFields} />
                        </Show>
                    )}
                </Show>
            </Show>
        </div>
    );
}
