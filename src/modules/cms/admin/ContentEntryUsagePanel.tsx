import { For, Show, createResource, createSignal } from 'solid-js';
import { CellButton } from '@core/components/table/CellButton';
import { Dropdown } from '@core/components/disclosure/Dropdown';
import { Icon } from '@shared/components/icons/Icon';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t, tOrLiteral } from '@/shared/i18n/t';

/** matchKind -> nhãn tiếng Việt dễ hiểu (giá trị runtime từ BE, không phải literal —
 * dùng tOrLiteral, không dùng t() strict). Xem UsageLocation ở
 * contentEntryUsage.service.ts (BE) cho ý nghĩa từng giá trị. */
const MATCH_KIND_LABEL_KEY: Record<string, string> = {
    detail: 'cms.contentEntries.usage.matchKind.detail',
    'detail-not-visible': 'cms.contentEntries.usage.matchKind.detailNotVisible',
    pinned: 'cms.contentEntries.usage.matchKind.pinned',
    'pinned-not-visible': 'cms.contentEntries.usage.matchKind.pinnedNotVisible',
    'dynamic-confirmed': 'cms.contentEntries.usage.matchKind.dynamicConfirmed',
    'dynamic-possible': 'cms.contentEntries.usage.matchKind.dynamicPossible',
    contextual: 'cms.contentEntries.usage.matchKind.contextual',
};

/** sectionType -> nhãn khối, tái dùng đúng key đã có cho danh sách loại khối trong
 * Page Builder (cms.builder.blockTypes.*, xem SECTION_TYPE_META ở sectionRegistry.ts)
 * thay vì định nghĩa lại — nhưng KHÔNG import sectionRegistry.ts trực tiếp vì file đó
 * kéo theo toàn bộ danh sách section component (nặng, không cần cho màn danh sách
 * Content Entries). 'collection-detail-page' là sectionType tổng hợp riêng của tra cứu
 * này (không phải 1 loại khối thật) nên có key riêng. */
const SECTION_TYPE_LABEL_KEY: Record<string, string> = {
    'collection-detail-page': 'cms.contentEntries.usage.sectionTypeDetailPage',
    'content-grid': 'cms.builder.blockTypes.contentGrid',
    'featured-entry': 'cms.builder.blockTypes.featuredEntry',
    'project-showcase': 'cms.builder.blockTypes.projectShowcase',
    'logo-grid': 'cms.builder.blockTypes.logoGrid',
    'mixed-feed': 'cms.builder.blockTypes.mixedFeed',
    'related-entries': 'cms.builder.blockTypes.relatedEntries',
    'backlink-entries': 'cms.builder.blockTypes.backlinkEntries',
};

export interface ContentEntryUsagePanelProps {
    entryId: string;
}

/**
 * Thay cho nút "Xem trang" cũ (suy đoán 1 URL duy nhất từ detailPathPattern) — tra cứu
 * THẬT mọi trang/khối đang dùng bản ghi này (getContentEntryUsage, BE Task 2 của kế
 * hoạch 2026-08-08-visibility-rules-simplify-and-usage-lookup). Mở dropdown khi bấm nút,
 * fetch lười (chỉ gọi API lần đầu mở) để không tốn N query cho N dòng datatable ngay khi
 * vào trang.
 */
export function ContentEntryUsagePanel(props: ContentEntryUsagePanelProps) {
    let triggerRef: HTMLElement | undefined;
    const { navigateToPage } = useRoutes();
    const [open, setOpen] = createSignal(false);

    const [locations] = createResource(
        () => (open() ? props.entryId : undefined),
        (entryId) => ContentEntryService.getContentEntryUsage({ entryId }),
    );

    const openBuilder = (pageId: string) => {
        setOpen(false);
        navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId } } });
    };

    return (
        <>
            {/* KHÔNG gắn onClick riêng ở đây — <Dropdown reference={...} trigger="click"> (mặc định
                của Dropdown) đã tự lắng nghe click trên chính element này để mở/đóng. Gắn thêm
                onClick toggle ở đây sẽ tạo ra 2 cơ chế toggle độc lập cùng phản ứng với 1 click
                (pointerup listener nội bộ của Floating + click handler này), triệt tiêu lẫn nhau
                (mở rồi đóng ngay trong cùng 1 click) — đã QA thấy bug này thật (query
                getContentEntryUsage vẫn bắn đi nhưng panel không mở) trước khi bỏ onClick. */}
            <CellButton
                ref={(el) => (triggerRef = el)}
                icon={<Icon name="heroicons-outline:list-bullet" tooltip={t('cms.contentEntries.usageButton')} />}
            />
            <Dropdown
                reference={triggerRef!}
                open={open()}
                onOpen={setOpen}
                placement="bottom-end"
                class="w-[26rem] max-w-[92vw] p-3"
            >
                <p class="text-sm font-bold text-neutral-900 px-1 pb-2">{t('cms.contentEntries.usage.panelTitle')}</p>

                <Show when={!locations.loading} fallback={
                    <div class="px-1 py-4 text-sm text-neutral-400">{t('cms.contentEntries.usage.loading')}</div>
                }>
                    <Show
                        when={(locations() || []).length > 0}
                        fallback={
                            <div class="px-1 py-3 text-sm text-neutral-500 leading-relaxed">
                                {t('cms.contentEntries.usage.empty')}
                            </div>
                        }
                    >
                        <div class="flex flex-col gap-2 max-h-96 overflow-y-auto pr-0.5">
                            <For each={locations()}>
                                {(loc) => (
                                    <div class="rounded-lg border border-neutral-100 p-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0">
                                                <p class="text-sm font-semibold text-neutral-900 break-words">{loc?.pageLabel}</p>
                                                <p class="text-xs text-neutral-400 break-all mt-0.5">{loc?.pagePath}</p>
                                            </div>
                                            <span class="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-main-50 text-main-700 text-right leading-tight">
                                                {tOrLiteral(MATCH_KIND_LABEL_KEY[loc?.matchKind ?? ''] || '') || loc?.matchKind}
                                            </span>
                                        </div>
                                        <Show when={loc?.matchKind !== 'detail' && loc?.matchKind !== 'detail-not-visible' && loc?.sectionType}>
                                            <p class="text-xs text-neutral-500 mt-1.5">
                                                {tOrLiteral(SECTION_TYPE_LABEL_KEY[loc?.sectionType ?? ''] || '') || loc?.sectionType}
                                            </p>
                                        </Show>
                                        <div class="flex items-center flex-wrap gap-2 mt-2.5">
                                            <Show when={loc?.url}>
                                                <CellButton
                                                    sm
                                                    outline
                                                    label={t('cms.contentEntries.usage.openLive')}
                                                    icon={<Icon name="heroicons-outline:arrow-top-right-on-square" />}
                                                    onClick={() => window.open(loc!.url!, '_blank')}
                                                />
                                            </Show>
                                            <CellButton
                                                sm
                                                light
                                                label={t('cms.contentEntries.usage.openBuilder')}
                                                icon={<Icon name="heroicons-outline:pencil-square" />}
                                                onClick={() => openBuilder(loc!.pageId!)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </Dropdown>
        </>
    );
}
