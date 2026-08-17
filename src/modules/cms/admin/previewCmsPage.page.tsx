import { Show, createResource, createSignal } from 'solid-js';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { resolveCmsPageProps } from '@/modules/cms/api/resolveCmsPageProps';
import { NodeRenderer } from '@/modules/cms/node/NodeRenderer';
import type { NodeRenderContext } from '@/modules/cms/node/node.types';
import { useBreakpoint } from '@core/hooks/useBreakpoint';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';

/**
 * Preview 1 trang CÒN Ở TRẠNG THÁI DRAFT (mục 13 spec CMS) — render bằng đúng
 * SectionRenderer/AnimationController mà public site dùng, chỉ khác nguồn dữ
 * liệu là `previewPageResolver` (yêu cầu đăng nhập, bỏ qua điều kiện PUBLISHED).
 * Không đi qua Astro SSR public vì route đó không có JWT của admin.
 *
 * Phase 0 M3a fix: thêm render Node tree song song SectionRenderer (đúng coexistence
 * pattern CmsPageShell.astro đã có từ M1) — trước fix này, 1 trang preview chỉ có Node
 * (không Section nào) sẽ hiện trắng trơn dù trang public thật (qua CmsPageShell.astro)
 * render đúng. `NodeRenderContext` build thủ công ở đây (không có cookie/URL thật như
 * Astro) — giá trị mặc định hợp lý cho ngữ cảnh admin xem trước, cùng tinh thần
 * NodeBuilder.page.tsx's `EMPTY_CONTEXT` nhưng có `contextEntry`/`locale`/`pathParams`
 * thật từ `resolveCmsPageProps` vì trang Chi tiết cần chúng để render đúng.
 */
export function PreviewCmsPage() {
    const { searchParams, navigate } = useRoutes();
    const { breakpoint } = useBreakpoint();
    const path = () => (searchParams.path as string) || '/';
    const [refreshKey, setRefreshKey] = createSignal(0);

    const [props] = createResource(() => `${path()}::${refreshKey()}`, () => resolveCmsPageProps(path(), { preview: true }));

    const nodeContext = (p: NonNullable<ReturnType<typeof props>>): NodeRenderContext => ({
        contextEntry: p.pageEntry?.data as Record<string, any> | undefined,
        contextEntryId: p.pageEntry?.id,
        // Reviewer fix (Important #2, Canvas Editor v2 Task 12 whole-branch review) — this
        // construction site was missing `contextEntryContentTypeId` entirely, so ContentDetailNode
        // on Draft Preview always fell back to its legacy static node.props.contentTypeId,
        // never the ancestor-resolved one CmsPageShell.astro's public SSR already supplies.
        // Mirrors CmsPageShell.astro's `contextEntryContentTypeId: pageEntry?.contentTypeId` line
        // exactly, using this file's own resolved-page-entry variable (`p.pageEntry`).
        contextEntryContentTypeId: p.pageEntry?.contentTypeId,
        isCustomerLoggedIn: false,
        device: breakpoint,
        queryParams: {},
        pathParams: p.pathParams ?? {},
        now: new Date(),
        locale: p.locale,
    });

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
                            when={(p().nodeTree?.length ?? 0) > 0}
                            fallback={
                                <div class="p-10 text-center">
                                    <p class="text-lg font-semibold text-neutral-700">{t('cms.pages.emptyPageNoSections')}</p>
                                </div>
                            }
                        >
                            <Show when={p().nodeTree?.length}>
                                <div data-node-tree-root>
                                    {p().nodeTree!.map((root) => <NodeRenderer node={root} context={nodeContext(p())} />)}
                                </div>
                            </Show>
                        </Show>
                    )}
                </Show>
            </Show>
        </div>
    );
}
