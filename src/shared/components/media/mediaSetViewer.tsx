// @shared/components/media/MediaSetViewer.tsx
//
// variant="strip"  — scroll ngang, thumbnail nhỏ, click → lightbox
// variant="grid"   — mosaic layout theo số ảnh, click → lightbox
// variant="slide"  — 1 ảnh to, nút prev/next, dots, autoplay, click → lightbox

import {
    For, Show, createSignal, onCleanup, onMount, createMemo, batch,
} from 'solid-js';
import { Portal } from 'solid-js/web';

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaItem = {
    id?: string;
    url?: string;
    fullUrl?: string;
    fileName?: string;
    fileSize?: number;
};

export interface MediaSetViewerProps {
    mediaSet?: { medias?: MediaItem[] } | null;
    medias?: MediaItem[];
    variant?: 'strip' | 'grid' | 'slide';
    class?: string;
    /** Strip: giới hạn số ảnh hiển thị, phần dư ẩn với "+N" */
    maxVisible?: number;
    /** Slide: tỉ lệ khung ảnh, mặc định '16/9' */
    aspectRatio?: string;
    /** Slide: autoplay interval (ms), 0 = tắt */
    autoplay?: number;
    /** Cho phép mở lightbox khi click, mặc định true */
    lightbox?: boolean;
}

const getUrl = (m: MediaItem) => m.fullUrl ?? m.url ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────

function Lightbox(props: {
    medias: MediaItem[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [index, setIndex] = createSignal(props.initialIndex);
    const [zoomed, setZoomed] = createSignal(false);
    const [leaving, setLeaving] = createSignal(false);
    const [dir, setDir] = createSignal<'next' | 'prev' | null>(null);
    const current = createMemo(() => props.medias[index()]);
    const total = () => props.medias.length;

    const go = (d: 1 | -1) => {
        if (leaving()) return;
        batch(() => { setDir(d === 1 ? 'next' : 'prev'); setLeaving(true); setZoomed(false); });
        setTimeout(() => {
            setIndex(i => (i + d + total()) % total());
            setDir(null);
            setTimeout(() => setLeaving(false), 20);
        }, 160);
    };

    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'Escape') props.onClose();
    };

    onMount(() => {
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
    });
    onCleanup(() => {
        document.removeEventListener('keydown', handleKey);
        document.body.style.overflow = '';
    });

    let tx = 0;
    const onTouchStart = (e: TouchEvent) => { tx = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
        const dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
    };

    const imgCls = () => {
        if (!leaving()) return 'opacity-100 translate-x-0 scale-100';
        return dir() === 'next' ? 'opacity-0 -translate-x-10 scale-95' : 'opacity-0 translate-x-10 scale-95';
    };

    return (
        <Portal>
            <div
                class="fixed inset-0 z-9999 flex flex-col select-none"
                style={{ background: 'rgba(3,3,7,0.97)' }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div class="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,.55),transparent)' }}>
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-white/35 text-xs font-mono tabular-nums shrink-0">
                            {index() + 1}<span class="opacity-50"> / </span>{total()}
                        </span>
                        <Show when={current()?.fileName}>
                            <span class="text-white/35 text-xs truncate">· {current()!.fileName}</span>
                        </Show>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                        <a href={getUrl(current())} download={current()?.fileName} target="_blank"
                            rel="noopener noreferrer"
                            class="w-9 h-9 flex items-center justify-center rounded-xl
                      text-white/35 hover:text-white hover:bg-white/10 transition-all">
                            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path d="M10 2a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V3a1 1 0 011-1z" />
                                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                            </svg>
                        </a>
                        <button onClick={props.onClose}
                            class="w-9 h-9 flex items-center justify-center rounded-xl
                           text-white/35 hover:text-white hover:bg-white/10 transition-all">
                            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Image area */}
                <div class="flex-1 flex items-center justify-center relative min-h-0 px-12">
                    <Show when={total() > 1}>
                        <button onClick={() => go(-1)}
                            class="absolute left-2 z-10 w-10 h-10 flex items-center justify-center rounded-full
                           bg-white/7 hover:bg-white/14 text-white/65 hover:text-white
                           border border-white/8 backdrop-blur-sm transition-all">
                            <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </Show>

                    <div class={`transition-all duration-160 ease-out ${imgCls()}`}>
                        <img
                            src={getUrl(current())}
                            alt={current()?.fileName ?? ''}
                            onClick={() => setZoomed(z => !z)}
                            class={`rounded-xl shadow-2xl transition-all duration-300 ${zoomed() ? 'max-h-[92vh] max-w-[96vw] cursor-zoom-out'
                                    : 'max-h-[74vh] max-w-[80vw] cursor-zoom-in'
                                }`}
                            draggable={false}
                        />
                    </div>

                    <Show when={total() > 1}>
                        <button onClick={() => go(1)}
                            class="absolute right-2 z-10 w-10 h-10 flex items-center justify-center rounded-full
                           bg-white/7 hover:bg-white/14 text-white/65 hover:text-white
                           border border-white/8 backdrop-blur-sm transition-all">
                            <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </Show>
                </div>

                {/* Filmstrip */}
                <Show when={total() > 1}>
                    <div class="shrink-0 flex gap-1.5 overflow-x-auto justify-center px-4 pt-3 pb-4"
                        style={{ background: 'linear-gradient(to top,rgba(0,0,0,.6),transparent)' }}>
                        <For each={props.medias}>
                            {(m, i) => (
                                <button onClick={() => { setZoomed(false); setIndex(i()); }}
                                    class={`shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${i() === index()
                                            ? 'w-14 h-14 ring-2 ring-white opacity-100 scale-105'
                                            : 'w-11 h-11 opacity-30 hover:opacity-65 hover:scale-105'
                                        }`}>
                                    <img src={getUrl(m)} alt="" class="w-full h-full object-cover" loading="lazy" />
                                </button>
                            )}
                        </For>
                    </div>
                </Show>
            </div>
        </Portal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip variant
// ─────────────────────────────────────────────────────────────────────────────

function StripVariant(props: {
    medias: MediaItem[];
    maxVisible?: number;
    onOpen?: (i: number) => void;
    class?: string;
}) {
    const max = () => props.maxVisible ?? 99;
    const visible = createMemo(() => props.medias.slice(0, max()));
    const overflow = createMemo(() => Math.max(0, props.medias.length - max()));

    return (
        <div class={`flex gap-1.5 overflow-x-auto pb-0.5
                 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent
                 ${props.class ?? ''}`}>
            <For each={visible()}>
                {(m, i) => (
                    <button
                        onClick={() => props.onOpen?.(i())}
                        class="shrink-0 relative w-16 h-16 rounded-xl overflow-hidden
                   ring-1 ring-black/8 hover:ring-slate-300
                   transition-all duration-200 hover:scale-105 hover:shadow-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <img src={getUrl(m)} alt={m.fileName ?? ''} class="w-full h-full object-cover" loading="lazy" />
                        <Show when={i() === max() - 1 && overflow() > 0}>
                            <div class="absolute inset-0 bg-black/58 flex items-center justify-center">
                                <span class="text-white text-xs font-bold">+{overflow()}</span>
                            </div>
                        </Show>
                    </button>
                )}
            </For>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid variant — mosaic
// ─────────────────────────────────────────────────────────────────────────────

function GridVariant(props: {
    medias: MediaItem[];
    onOpen?: (i: number) => void;
    class?: string;
}) {
    const count = () => props.medias.length;
    const preview = createMemo(() => props.medias.slice(0, 5));
    const extra = createMemo(() => Math.max(0, count() - 5));

    const cellCls = 'relative overflow-hidden group cursor-pointer focus:outline-none';
    const imgCls = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105';
    const overlayCls = 'absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200';

    const Cell = (m: MediaItem, i: number, ratio: string, isLast = false) => (
        <button onClick={() => props.onOpen?.(i)} class={cellCls} style={{ 'aspect-ratio': ratio }}>
            <img src={getUrl(m)} alt={m.fileName ?? ''} class={imgCls} loading="lazy" />
            <div class={overlayCls} />
            <Show when={isLast && extra() > 0}>
                <div class="absolute inset-0 bg-black/58 flex items-center justify-center">
                    <span class="text-white text-xl font-bold">+{extra()}</span>
                </div>
            </Show>
        </button>
    );

    return (
        <div class={`rounded-2xl overflow-hidden ${props.class ?? ''}`}>
            {/* 1 ảnh */}
            <Show when={count() === 1}>{Cell(preview()[0], 0, '16/9')}</Show>

            {/* 2 ảnh */}
            <Show when={count() === 2}>
                <div class="grid grid-cols-2 gap-0.5">
                    {Cell(preview()[0], 0, '1/1')}
                    {Cell(preview()[1], 1, '1/1')}
                </div>
            </Show>

            {/* 3 ảnh: 1 to trên, 2 nhỏ dưới */}
            <Show when={count() === 3}>
                <div class="grid grid-cols-2 gap-0.5">
                    <div class="col-span-2">{Cell(preview()[0], 0, '2/1')}</div>
                    {Cell(preview()[1], 1, '1/1')}
                    {Cell(preview()[2], 2, '1/1')}
                </div>
            </Show>

            {/* 4 ảnh: 2x2 */}
            <Show when={count() === 4}>
                <div class="grid grid-cols-2 gap-0.5">
                    {Cell(preview()[0], 0, '1/1')}
                    {Cell(preview()[1], 1, '1/1')}
                    {Cell(preview()[2], 2, '1/1')}
                    {Cell(preview()[3], 3, '1/1')}
                </div>
            </Show>

            {/* 5+ ảnh: 1 to trái + 2x2 phải */}
            <Show when={count() >= 5}>
                <div class="grid grid-cols-3 gap-0.5">
                    <div class="col-span-2 row-span-2" style={{ 'aspect-ratio': '1/1' }}>
                        {Cell(preview()[0], 0, '1/1')}
                    </div>
                    {Cell(preview()[1], 1, '1/1')}
                    {Cell(preview()[2], 2, '1/1')}
                    {Cell(preview()[3], 3, '1/1')}
                    {Cell(preview()[4], 4, '1/1', true)}
                </div>
            </Show>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide variant — 1 ảnh to, prev/next, dots, autoplay
// ─────────────────────────────────────────────────────────────────────────────

function SlideVariant(props: {
    medias: MediaItem[];
    aspectRatio?: string;
    autoplay?: number;
    onOpen?: (i: number) => void;
    class?: string;
}) {
    const [index, setIndex] = createSignal(0);
    const [leaving, setLeaving] = createSignal(false);
    const [dir, setDir] = createSignal<'next' | 'prev' | null>(null);
    const total = () => props.medias.length;
    const current = createMemo(() => props.medias[index()]);

    const go = (d: 1 | -1) => {
        if (leaving() || total() <= 1) return;
        batch(() => { setDir(d === 1 ? 'next' : 'prev'); setLeaving(true); });
        setTimeout(() => {
            setIndex(i => (i + d + total()) % total());
            setDir(null);
            setTimeout(() => setLeaving(false), 20);
        }, 200);
    };

    // Autoplay
    let timer: ReturnType<typeof setInterval> | undefined;
    onMount(() => {
        if ((props.autoplay ?? 0) > 0) timer = setInterval(() => go(1), props.autoplay);
    });
    onCleanup(() => { if (timer) clearInterval(timer); });

    // Swipe
    let tx = 0;
    const onTouchStart = (e: TouchEvent) => { tx = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
        const dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    };

    const imgCls = () => {
        if (!leaving()) return 'opacity-100 translate-x-0';
        return dir() === 'next' ? 'opacity-0 -translate-x-10' : 'opacity-0 translate-x-10';
    };

    return (
        <div
            class={`relative rounded-2xl overflow-hidden bg-slate-100 group ${props.class ?? ''}`}
            style={{ 'aspect-ratio': props.aspectRatio ?? '16/9' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Image */}
            <img
                src={getUrl(current())}
                alt={current()?.fileName ?? ''}
                onClick={() => props.onOpen?.(index())}
                class={`w-full h-full object-cover transition-all duration-200 ease-out
                ${imgCls()}
                ${props.onOpen ? 'cursor-pointer' : ''}`}
                draggable={false}
            />

            {/* Gradient vignette */}
            <div class="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom,transparent 55%,rgba(0,0,0,.42) 100%)' }} />
            <Show when={total() > 1}>
                <div class="absolute inset-y-0 left-0 w-20 pointer-events-none"
                    style={{ background: 'linear-gradient(to right,rgba(0,0,0,.18),transparent)' }} />
                <div class="absolute inset-y-0 right-0 w-20 pointer-events-none"
                    style={{ background: 'linear-gradient(to left,rgba(0,0,0,.18),transparent)' }} />
            </Show>

            {/* Prev / Next */}
            <Show when={total() > 1}>
                <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 z-10
                 w-9 h-9 flex items-center justify-center rounded-full
                 bg-black/28 hover:bg-black/50 text-white/80 hover:text-white
                 backdrop-blur-sm transition-all duration-200
                 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-4.5 h-4.5">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 z-10
                 w-9 h-9 flex items-center justify-center rounded-full
                 bg-black/28 hover:bg-black/50 text-white/80 hover:text-white
                 backdrop-blur-sm transition-all duration-200
                 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-4.5 h-4.5">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            </Show>

            {/* Counter badge */}
            <Show when={total() > 1}>
                <div class="absolute top-2.5 right-3 z-10 pointer-events-none">
                    <span class="text-[11px] font-semibold text-white/75 tabular-nums
                       bg-black/28 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        {index() + 1} / {total()}
                    </span>
                </div>
            </Show>

            {/* Expand button */}
            <Show when={props.onOpen && total() > 0}>
                <button
                    onClick={(e) => { e.stopPropagation(); props.onOpen?.(index()); }}
                    class="absolute top-2.5 left-3 z-10 w-7 h-7 flex items-center justify-center
                 rounded-lg bg-black/28 backdrop-blur-sm text-white/55 hover:text-white
                 transition-all opacity-0 group-hover:opacity-100"
                >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 16.25v-4.5m0 4.5h4.5m-4.5 0L9 11M16.25 3.75h-4.5m4.5 0v4.5m0-4.5L11 9M16.25 16.25h-4.5m4.5 0v-4.5m0 4.5L11 11" />
                    </svg>
                </button>
            </Show>

            {/* Dots */}
            <Show when={total() > 1}>
                <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                    <div class="flex items-center gap-1 pointer-events-auto">
                        <For each={props.medias}>
                            {(_, i) => (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIndex(i()); }}
                                    class={`rounded-full transition-all duration-300 ${i() === index()
                                            ? 'w-5 h-1.5 bg-white shadow-sm'
                                            : 'w-1.5 h-1.5 bg-white/45 hover:bg-white/75'
                                        }`}
                                />
                            )}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function MediaSetViewer(props: MediaSetViewerProps) {
    const medias = createMemo<MediaItem[]>(() =>
        (props.medias ?? props.mediaSet?.medias ?? []).filter(m => !!getUrl(m))
    );

    const allowLightbox = () => props.lightbox !== false;
    const [lbIndex, setLbIndex] = createSignal<number | null>(null);
    const open = (i: number) => { if (allowLightbox()) setLbIndex(i); };
    const close = () => setLbIndex(null);

    return (
        <Show when={medias().length > 0}>
            <Show when={props.variant === 'grid'}>
                <GridVariant medias={medias()} onOpen={allowLightbox() ? open : undefined} class={props.class} />
            </Show>

            <Show when={props.variant === 'slide'}>
                <SlideVariant
                    medias={medias()}
                    aspectRatio={props.aspectRatio}
                    autoplay={props.autoplay}
                    onOpen={allowLightbox() ? open : undefined}
                    class={props.class}
                />
            </Show>

            <Show when={!props.variant || props.variant === 'strip'}>
                <StripVariant
                    medias={medias()}
                    maxVisible={props.maxVisible}
                    onOpen={allowLightbox() ? open : undefined}
                    class={props.class}
                />
            </Show>

            <Show when={lbIndex() !== null}>
                <Lightbox medias={medias()} initialIndex={lbIndex()!} onClose={close} />
            </Show>
        </Show>
    );
}