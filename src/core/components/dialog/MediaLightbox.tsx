

import { createSignal, Show, For, onMount, onCleanup, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Icon } from '@shared/components/icons/Icon';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3];
const DEFAULT_ZOOM_IDX = 2; // 1x

export interface LightboxMedia {
    id?: string;
    url: string;
    type?: string; // 'IMAGE' | 'PDF' | 'VIDEO' | ...
    fileName?: string;
}

interface MediaLightboxProps {
    medias: LightboxMedia[];
    initialIndex?: number;
    onClose: () => void;
}

export function MediaLightbox(props: MediaLightboxProps) {
    const [current, setCurrent] = createSignal(props.initialIndex ?? 0);
    const [loaded, setLoaded] = createSignal(false);
    const [zoomIdx, setZoomIdx] = createSignal(DEFAULT_ZOOM_IDX);

    const zoom = () => ZOOM_STEPS[zoomIdx()];
    const canZoomIn = () => zoomIdx() < ZOOM_STEPS.length - 1;
    const canZoomOut = () => zoomIdx() > 0;
    const zoomIn = () => { if (canZoomIn()) setZoomIdx(i => i + 1); };
    const zoomOut = () => { if (canZoomOut()) setZoomIdx(i => i - 1); };
    const resetZoom = () => setZoomIdx(DEFAULT_ZOOM_IDX);

    const media = createMemo(() => props.medias[current()]);
    const isPdf = createMemo(() =>
        media()?.type === 'PDF' ||
        media()?.url?.toLowerCase().includes('.pdf')
    );
    const isVideo = createMemo(() =>
        media()?.type === 'VIDEO' ||
        /\.(mp4|webm|mov)$/i.test(media()?.url ?? '')
    );

    const goTo = (idx: number) => {
        setLoaded(false);
        setCurrent(idx);
        resetZoom();
    };
    const prev = () => goTo(Math.max(0, current() - 1));
    const next = () => goTo(Math.min(props.medias.length - 1, current() + 1));
    const canPrev = () => current() > 0;
    const canNext = () => current() < props.medias.length - 1;

    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') props.onClose();
        if (e.key === 'ArrowLeft' && canPrev()) prev();
        if (e.key === 'ArrowRight' && canNext()) next();
        if (e.key === '+' || e.key === '=') zoomIn();
        if (e.key === '-') zoomOut();
        if (e.key === '0') resetZoom();
    };

    onMount(() => document.addEventListener('keydown', onKey));
    onCleanup(() => document.removeEventListener('keydown', onKey));

    return (
        // Portal → render vào document.body, thoát khỏi mọi stacking context
        // (Leaflet map dùng CSS transform tạo stacking context riêng, làm
        //  position:fixed bên trong bị ảnh hưởng → Portal fix vấn đề này)
        <Portal>
        <div
            class="fixed inset-0 flex flex-col"
            style={{ 'z-index': 2147483647, background: 'rgba(5,5,10,0.97)' }}
            onClick={props.onClose}
        >
            {/* ── Top bar ── */}
            <div
                class="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                onClick={e => e.stopPropagation()}
            >
                <div class="flex items-center gap-3">
                    <span class="text-white/40 text-xs font-mono tabular-nums">
                        {current() + 1} / {props.medias.length}
                    </span>
                    <Show when={media()?.fileName}>
                        <span class="text-white/60 text-xs truncate max-w-[200px]">{media()!.fileName}</span>
                    </Show>
                </div>
                <div class="flex items-center gap-2">
                    {/* Zoom controls — chỉ hiện cho image */}
                    <Show when={!isPdf() && !isVideo()}>
                        <div class="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                            <button
                                onClick={zoomOut}
                                disabled={!canZoomOut()}
                                class="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition disabled:opacity-30"
                                title="Thu nhỏ (-)"
                            >
                                <Icon name="heroicons-outline:minus" class="w-4 h-4" />
                            </button>
                            <button
                                onClick={resetZoom}
                                class="px-2 text-xs font-mono text-white/60 hover:text-white transition tabular-nums"
                                title="Reset zoom (0)"
                            >
                                {Math.round(zoom() * 100)}%
                            </button>
                            <button
                                onClick={zoomIn}
                                disabled={!canZoomIn()}
                                class="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition disabled:opacity-30"
                                title="Phóng to (+)"
                            >
                                <Icon name="heroicons-outline:plus" class="w-4 h-4" />
                            </button>
                        </div>
                    </Show>
                    <a
                        href={media()?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition"
                        onClick={e => e.stopPropagation()}
                    >
                        <Icon name="heroicons-outline:external-link" class="w-3.5 h-3.5" />
                        Mở file gốc
                    </a>
                    <button
                        onClick={props.onClose}
                        class="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                        <Icon name="heroicons-outline:x" class="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── Main viewer ── */}
            <div
                class="flex-1 flex items-center justify-center relative min-h-0 px-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Prev */}
                <button
                    onClick={prev}
                    disabled={!canPrev()}
                    class="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-white transition shrink-0"
                    classList={{
                        'bg-white/10 hover:bg-white/20 cursor-pointer': canPrev(),
                        'opacity-0 pointer-events-none': !canPrev(),
                    }}
                >
                    <Icon name="heroicons-outline:chevron-left" class="w-5 h-5" />
                </button>

                {/* Content */}
                <div class="flex items-center justify-center w-full h-full">
                    <Show when={isPdf()}>
                        <div class="flex flex-col items-center gap-4">
                            <div class="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                <Icon name="heroicons-outline:document" class="w-10 h-10 text-red-400" />
                            </div>
                            <p class="text-white/60 text-sm">File PDF</p>
                            <a
                                href={media()?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-3 rounded-xl transition"
                            >
                                <Icon name="heroicons-outline:external-link" class="w-4 h-4" />
                                Mở báo cáo PDF
                            </a>
                        </div>
                    </Show>
                    <Show when={!isPdf() && !isVideo()}>
                        {/* Scrollable container khi zoom > 1 */}
                        <div
                            class="w-full overflow-auto"
                            style={{ 'max-height': 'calc(100dvh - 160px)' }}
                        >
                            <div
                                class="flex items-center justify-center"
                                style={{ 'min-height': 'calc(100dvh - 160px)' }}
                            >
                                <Show when={!loaded()}>
                                    <div class="absolute flex items-center justify-center">
                                        <div class="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    </div>
                                </Show>
                                <img
                                    src={media()?.url}
                                    alt=""
                                    class="rounded-xl transition-all duration-200"
                                    style={{
                                        // Khi zoom = 1: fit vào viewport; khi zoom > 1: hiển thị đầy đủ và scroll
                                        'max-width': zoom() <= 1 ? '100%' : 'none',
                                        'max-height': zoom() <= 1 ? 'calc(100dvh - 160px)' : 'none',
                                        width: zoom() !== 1 ? `${zoom() * 100}%` : undefined,
                                        'object-fit': 'contain',
                                        opacity: loaded() ? '1' : '0',
                                        cursor: zoom() > 1 ? 'grab' : 'default',
                                    }}
                                    onLoad={() => setLoaded(true)}
                                />
                            </div>
                        </div>
                    </Show>
                    <Show when={isVideo()}>
                        <video
                            src={media()?.url}
                            controls
                            class="rounded-xl"
                            style={{ 'max-height': 'calc(100dvh - 160px)', 'max-width': '100%' }}
                        />
                    </Show>
                </div>

                {/* Next */}
                <button
                    onClick={next}
                    disabled={!canNext()}
                    class="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-white transition shrink-0"
                    classList={{
                        'bg-white/10 hover:bg-white/20 cursor-pointer': canNext(),
                        'opacity-0 pointer-events-none': !canNext(),
                    }}
                >
                    <Icon name="heroicons-outline:chevron-right" class="w-5 h-5" />
                </button>
            </div>

            {/* ── Thumbnail strip ── */}
            <Show when={props.medias.length > 1}>
                <div
                    class="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto shrink-0"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <For each={props.medias}>
                        {(m, idx) => (
                            <button
                                onClick={() => { setLoaded(false); setCurrent(idx()); }}
                                class="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                                classList={{
                                    'border-white scale-105': idx() === current(),
                                    'border-transparent opacity-40 hover:opacity-65': idx() !== current(),
                                }}
                            >
                                <Show
                                    when={m.type !== 'PDF' && !m.url?.toLowerCase().includes('.pdf')}
                                    fallback={
                                        <div class="w-full h-full bg-red-900/40 flex items-center justify-center">
                                            <span class="text-[9px] font-black text-red-300">PDF</span>
                                        </div>
                                    }
                                >
                                    <img src={m.url} alt="" class="w-full h-full object-cover" />
                                </Show>
                            </button>
                        )}
                    </For>
                </div>
            </Show>
        </div>
        </Portal>
    );
}

// ─── MediaGrid — thumbnail grid with open-lightbox support ───────────────────
interface MediaGridProps {
    medias: LightboxMedia[];
    max?: number; // max thumbnails before "+N more"
    class?: string;
}

export function MediaGrid(props: MediaGridProps) {
    const [lightboxIdx, setLightboxIdx] = createSignal<number | null>(null);
    const maxVisible = () => props.max ?? 4;
    const visible = () => props.medias.slice(0, maxVisible());
    const extra = () => Math.max(0, props.medias.length - maxVisible());

    if (!props.medias.length) return null;

    return (
        <>
            <div class={`flex gap-2 flex-wrap ${props.class ?? ''}`}>
                <For each={visible()}>
                    {(m, idx) => {
                        const isLast = () => idx() === visible().length - 1 && extra() > 0;
                        const isPdf = m.type === 'PDF' || m.url?.toLowerCase().includes('.pdf');
                        return (
                            <button
                                onClick={() => setLightboxIdx(idx())}
                                class="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-300 hover:scale-[1.03] transition-all shadow-sm shrink-0 bg-slate-100"
                            >
                                <Show when={!isPdf} fallback={
                                    <div class="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-1">
                                        <Icon name="heroicons-outline:document" class="w-7 h-7 text-red-400" />
                                        <span class="text-[9px] font-black text-red-500">PDF</span>
                                    </div>
                                }>
                                    <img src={m.url} alt="" class="w-full h-full object-cover" loading="lazy" />
                                </Show>
                                <Show when={isLast()}>
                                    <div class="absolute inset-0 bg-black/55 flex items-center justify-center rounded-2xl">
                                        <span class="text-white font-black text-base">+{extra()}</span>
                                    </div>
                                </Show>
                            </button>
                        );
                    }}
                </For>
            </div>
            <Show when={lightboxIdx() !== null}>
                <MediaLightbox
                    medias={props.medias}
                    initialIndex={lightboxIdx()!}
                    onClose={() => setLightboxIdx(null)}
                />
            </Show>
        </>
    );
}