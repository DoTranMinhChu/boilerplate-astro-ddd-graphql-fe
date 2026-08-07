import { For, Show, createResource } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { t } from '@/shared/i18n/t';
import { PageVersionService } from '@/shared/services/pageVersion/pageVersion.service';

export function PageVersionHistoryPanel(props: { pageId: string; onRestored: () => void }) {
    const [versions, { refetch }] = createResource(() => props.pageId, (pageId) => PageVersionService.getPageVersions({ pageId }));

    const restore = async (versionId: string) => {
        // Restoring hard-replaces every current section of the page — same destructive
        // weight as deleting a block, so reuse the exact same confirm-modal pattern
        // BlockList.tsx uses for its single-block delete (confirmAction(), not window.confirm()).
        const confirmed = await confirmAction().danger(() => t('cms.builder.history.restoreConfirm'));
        if (!confirmed) return;
        try {
            await PageVersionService.restorePageVersion({ pageId: props.pageId, versionId });
            toast().success(t('cms.builder.history.restoreSuccess'));
            props.onRestored();
            refetch();
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    return (
        <div class="space-y-2">
            <Show when={(versions()?.length ?? 0) > 0} fallback={<p class="text-sm text-neutral-400">{t('cms.builder.history.empty')}</p>}>
                <For each={versions()}>
                    {(version) => (
                        <div class="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3">
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium text-neutral-800">{version.label || t('cms.builder.history.untitled')}</p>
                                <p class="text-xs text-neutral-400">{new Date(version.createdAt as unknown as string).toLocaleString('vi-VN')}</p>
                            </div>
                            <Button sm outline onClick={() => restore(version.id!)}>
                                <Icon name="heroicons-solid:arrow-uturn-left" /> {t('cms.builder.history.restoreButton')}
                            </Button>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
}
