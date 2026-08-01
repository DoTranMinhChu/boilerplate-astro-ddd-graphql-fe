// src/core/components/map/InputGPS.tsx
// Mobile-first refactor: crosshair pin + collapsible top toolbar
// Pattern aligned with InputPolygon v2

import { createSignal, createEffect, onCleanup, onMount, Show, splitProps, For } from 'solid-js';
import L from 'leaflet';
import { Icon } from '@shared/components/icons/Icon';
import { Portal } from 'solid-js/web';
import { mergeClass } from '@core/helpers/class';
import { createControl } from '@core/components/control/createControl';
import { toDbPoint, toLeafletPoint } from './geoHelper';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: typeof iconUrl === 'string' ? iconUrl : (iconUrl as any).src,
    iconRetinaUrl: typeof iconRetinaUrl === 'string' ? iconRetinaUrl : (iconRetinaUrl as any).src,
    shadowUrl: typeof shadowUrl === 'string' ? shadowUrl : (shadowUrl as any).src,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type GPSPreviewMode = 'map' | 'text' | 'icon';

export interface InputGPSProps extends FormControlProps<[number, number]> {
    placeholder?: string;
    previewMode?: GPSPreviewMode;
}

// ─────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'info' | 'success' | 'warn' | 'error'; }
let _tid = 0;

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function InputGPS(props: InputGPSProps) {
    const [local] = splitProps(props, ['class', 'placeholder', 'readOnly', 'previewMode']);
    const { value, onChange, readOnly, error } = createControl<[number, number]>('object', props);
    const previewMode = (): GPSPreviewMode => local.previewMode ?? 'map';

    // ── state ──
    const [isOpen, setIsOpen] = createSignal(false);
    const [toolbarOpen, setToolbarOpen] = createSignal(false);

    /**
     * pinMode:
     *  'crosshair' — crosshair cố định giữa, kéo map để di chuyển (default khi mở)
     *  'click'     — click trực tiếp lên bản đồ để đặt pin (desktop fallback)
     */
    const [pinMode, setPinMode] = createSignal<'crosshair' | 'click'>('crosshair');

    /**
     * draft: tọa độ đang chọn, chưa confirm.
     * confirmed khi nhấn "Xác nhận".
     */
    const [draft, setDraft] = createSignal<[number, number] | null>(null);

    const [searchQuery, setSearchQuery] = createSignal('');
    const [searchLoading, setSearchLoading] = createSignal(false);
    const [locating, setLocating] = createSignal(false);
    const [toasts, setToasts] = createSignal<Toast[]>([]);

    // ── DOM refs ──
    let previewContainer: HTMLDivElement | undefined;
    let mapContainer: HTMLDivElement | undefined;
    let searchInputRef: HTMLInputElement | undefined;

    // ── Leaflet refs ──
    let previewMap: L.Map | undefined;
    let mapInstance: L.Map | undefined;
    let markerInstance: L.Marker | undefined;
    let deviceDot: L.CircleMarker | undefined;
    let deviceRing: L.Circle | undefined;

    // ─────────────────────────────────────────────────────
    // Toast
    // ─────────────────────────────────────────────────────

    const toast = (msg: string, type: Toast['type'] = 'info', ms = 2800) => {
        const id = ++_tid;
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms);
    };
    const toastCls: Record<Toast['type'], string> = {
        info: 'bg-gray-800', success: 'bg-green-600', warn: 'bg-amber-500', error: 'bg-red-600',
    };

    // ─────────────────────────────────────────────────────
    // Value helpers
    // ─────────────────────────────────────────────────────

    const storedCoords = (): [number, number] | null => {
        try { const v = value(); return toLeafletPoint(v) ?? null; } catch { return null; }
    };
    const hasValue = () => storedCoords() !== null;
    const fmt = (c: [number, number] | null) => c ? `${c[0].toFixed(6)}, ${c[1].toFixed(6)}` : '';

    // ─────────────────────────────────────────────────────
    // Marker helpers
    // ─────────────────────────────────────────────────────

    /** Đặt / di chuyển marker và cập nhật draft */
    const placeDraftMarker = (lat: number, lng: number) => {
        if (!mapInstance) return;
        if (markerInstance) {
            markerInstance.setLatLng([lat, lng]);
        } else {
            markerInstance = L.marker([lat, lng]).addTo(mapInstance);
        }
        setDraft([lat, lng]);
    };

    /** Bay đến tọa độ và đặt marker */
    const flyAndPlace = (lat: number, lng: number, zoom = 17) => {
        mapInstance?.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
        placeDraftMarker(lat, lng);
    };

    // ─────────────────────────────────────────────────────
    // Crosshair confirm — lấy tâm map hiện tại
    // ─────────────────────────────────────────────────────

    const confirmCrosshair = () => {
        if (!mapInstance) return;
        const c = mapInstance.getCenter();
        placeDraftMarker(c.lat, c.lng);
        toast(`📍 Đã ghim: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`, 'success');
    };

    // ─────────────────────────────────────────────────────
    // GPS locate
    // ─────────────────────────────────────────────────────

    const removeDeviceOverlay = () => {
        deviceDot?.remove(); deviceDot = undefined;
        deviceRing?.remove(); deviceRing = undefined;
    };

    const handleLocate = () => {
        if (!mapInstance || !('geolocation' in navigator)) { toast('Không hỗ trợ GPS', 'error'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
                mapInstance!.flyTo([lat, lng], 18, { animate: true, duration: 0.9 });
                removeDeviceOverlay();
                deviceRing = L.circle([lat, lng], { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1.5, dashArray: '4 3', interactive: false }).addTo(mapInstance!);
                deviceDot = L.circleMarker([lat, lng], { radius: 9, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 3, interactive: false }).addTo(mapInstance!);
                placeDraftMarker(lat, lng);
                setLocating(false);
                setToolbarOpen(false);
                toast('Đã tìm vị trí của bạn', 'success');
            },
            (err) => {
                setLocating(false);
                toast(['', 'Bị chặn quyền GPS', 'Không xác định vị trí', 'Hết thời gian GPS'][err.code] ?? 'Lỗi GPS', 'error');
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        );
    };

    // ─────────────────────────────────────────────────────
    // Search
    // ─────────────────────────────────────────────────────

    const handleSearch = async () => {
        const q = searchQuery().trim();
        if (!q || !mapInstance) return;
        const parts = q.split(/[,\s]+/);
        if (parts.length >= 2) {
            const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                flyAndPlace(lat, lng, 17);
                setToolbarOpen(false);
                return;
            }
        }
        setSearchLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, { headers: { 'Accept-Language': 'vi,en' } });
            const data = await res.json();
            if (data?.[0]) { flyAndPlace(parseFloat(data[0].lat), parseFloat(data[0].lon), 17); setToolbarOpen(false); }
            else toast('Không tìm thấy địa điểm', 'warn');
        } catch { toast('Lỗi kết nối', 'error'); }
        finally { setSearchLoading(false); }
    };

    // ─────────────────────────────────────────────────────
    // Preview map
    // ─────────────────────────────────────────────────────

    const destroyPreviewMap = () => { previewMap?.remove(); previewMap = undefined; };

    const initPreviewMap = () => {
        if (previewMode() !== 'map' || !previewContainer) return;
        destroyPreviewMap();
        const coords = storedCoords();
        if (!coords) return;
        previewMap = L.map(previewContainer, { zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false }).setView(coords, 16);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(previewMap);
        L.marker(coords).addTo(previewMap);
        setTimeout(() => previewMap?.invalidateSize(), 60);
    };

    // ─────────────────────────────────────────────────────
    // Draw map
    // ─────────────────────────────────────────────────────

    const initMap = () => {
        if (!mapContainer || mapInstance) return;
        const saved = storedCoords();
        const center: L.LatLngExpression = saved ?? [10.8231, 106.6297];

        mapInstance = L.map(mapContainer).setView(center, saved ? 16 : 13);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '©Google' }).addTo(mapInstance);

        if (saved) placeDraftMarker(saved[0], saved[1]);

        // Click mode: click để đặt pin
        mapInstance.on('click', (e: L.LeafletMouseEvent) => {
            if (pinMode() !== 'click') return;
            placeDraftMarker(e.latlng.lat, e.latlng.lng);
        });
    };

    const destroyDrawMap = () => {
        if (!mapInstance) return;
        removeDeviceOverlay();
        mapInstance.off(); mapInstance.remove(); mapInstance = undefined; markerInstance = undefined;
    };

    // ─────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────

    const handleConfirm = () => {
        const d = draft();
        if (d) onChange(toDbPoint(d[0], d[1]) as any);
        setIsOpen(false);
    };

    const handleClear = () => {
        markerInstance?.remove(); markerInstance = undefined;
        setDraft(null);
        toast('Đã xóa vị trí', 'info');
    };

    // ─────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────

    onMount(() => { const t = setTimeout(initPreviewMap, 120); onCleanup(() => { clearTimeout(t); destroyPreviewMap(); }); });

    createEffect(() => { value(); if (!isOpen()) { const t = setTimeout(initPreviewMap, 180); onCleanup(() => clearTimeout(t)); } });

    createEffect(() => {
        if (isOpen()) {
            setDraft(storedCoords());
            setPinMode('crosshair');
            const t = setTimeout(() => { initMap(); mapInstance?.invalidateSize(); }, 80);
            onCleanup(() => clearTimeout(t));
        } else {
            destroyDrawMap(); setDraft(null); setSearchQuery('');
            setLocating(false); setToolbarOpen(false); setPinMode('crosshair');
        }
    });

    createEffect(() => { if (toolbarOpen()) setTimeout(() => searchInputRef?.focus(), 60); });

    // ─────────────────────────────────────────────────────
    // JSX
    // ─────────────────────────────────────────────────────

    return (
        <>
            {/* ── PREVIEW BOX ── */}
            <div
                class={mergeClass(
                    'border rounded-lg overflow-hidden relative group cursor-pointer transition hover:border-indigo-400 hover:shadow-md',
                    error() ? 'border-red-400' : hasValue() ? 'border-blue-400' : 'border-gray-300 bg-gray-50',
                    readOnly() ? 'cursor-default' : '', local.class,
                )}
                style={{ height: previewMode() === 'map' ? '160px' : '64px' }}
                onClick={() => !readOnly() && setIsOpen(true)}
            >
                <Show when={hasValue()} fallback={
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
                        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon name="heroicons-outline:location-marker" class="w-7 h-7 text-gray-400" />
                        </div>
                        <span class="text-sm font-medium text-gray-500">Chưa có tọa độ GPS</span>
                        {!readOnly() && <span class="text-xs text-indigo-500 underline">Bấm để chọn vị trí</span>}
                    </div>
                }>
                    {/* mode: map */}
                    <Show when={previewMode() === 'map'}>
                        <div ref={previewContainer} class="absolute inset-0" style={{ 'z-index': 0 }} />
                        <div class="absolute inset-x-0 bottom-0 pointer-events-none" style={{ 'z-index': 500, background: 'linear-gradient(to top,rgba(0,0,0,.76) 0%,rgba(0,0,0,.34) 55%,transparent 100%)' }}>
                            <div class="px-3 py-2.5 flex items-end justify-between">
                                <div>
                                    <div class="flex items-center gap-1.5"><Icon name="heroicons-solid:location-marker" class="w-4 h-4 text-blue-400" /><span class="text-xs font-semibold text-white">Vị trí GPS</span></div>
                                    <span class="font-mono text-[11px] text-blue-200 pl-[22px]">{fmt(storedCoords())}</span>
                                </div>
                                {!readOnly() && <div class="text-xs font-semibold text-white bg-white/20 hover:bg-white/35 border border-white/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Icon name="heroicons-outline:pencil" class="w-3.5 h-3.5" />Sửa</div>}
                            </div>
                        </div>
                        <div class="absolute inset-0" style={{ 'z-index': 400 }} />
                    </Show>

                    {/* mode: text */}
                    <Show when={previewMode() === 'text'}>
                        <div class="absolute inset-0 flex items-center px-4 gap-3 select-none">
                            <div class="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0"><Icon name="heroicons-solid:location-marker" class="w-5 h-5 text-blue-600" /></div>
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Tọa độ GPS</div>
                                <div class="font-mono text-sm text-gray-800 truncate">{fmt(storedCoords())}</div>
                            </div>
                            {!readOnly() && <div class="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Icon name="heroicons-outline:pencil" class="w-3.5 h-3.5" />Sửa</div>}
                        </div>
                    </Show>

                    {/* mode: icon */}
                    <Show when={previewMode() === 'icon'}>
                        <div class="absolute inset-0 flex items-center px-4 gap-3 select-none">
                            <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Icon name="heroicons-solid:location-marker" class="w-5 h-5 text-blue-600" /></div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5"><span class="text-sm font-semibold text-gray-800">Vị trí GPS</span><span class="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓ Đã chọn</span></div>
                                <div class="font-mono text-xs text-gray-500 truncate">{fmt(storedCoords())}</div>
                            </div>
                            {!readOnly() && <div class="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Icon name="heroicons-outline:pencil" class="w-3.5 h-3.5" />Sửa</div>}
                        </div>
                    </Show>
                </Show>
            </div>
            <Show when={error()}><div class="text-xs text-red-500 mt-1">{error()}</div></Show>

            {/* ══════════════════════════════════════════════ */}
            {/* MAP MODAL                                     */}
            {/* ══════════════════════════════════════════════ */}
            <Show when={isOpen()}>
                <Portal>
                    <div class="fixed inset-0 flex flex-col bg-gray-900" style={{ 'z-index': 9000 }}>

                        {/* ── TOP BAR ── */}
                        <div class="shrink-0 bg-indigo-700 text-white shadow-md" style={{ 'z-index': 20 }}>

                            {/* Main row — always visible, height 48px */}
                            <div class="flex items-center gap-2 px-3 h-12">

                                {/* Hamburger */}
                                <button
                                    onClick={() => setToolbarOpen(o => !o)}
                                    class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition shrink-0"
                                    title="Công cụ"
                                >
                                    <Show when={toolbarOpen()} fallback={
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    }>
                                        <Icon name="heroicons-outline:x" class="w-5 h-5" />
                                    </Show>
                                </button>

                                {/* Status */}
                                <div class="flex-1 min-w-0 flex items-center gap-2">
                                    <Show when={pinMode() === 'crosshair'}>
                                        <span class="text-sm font-bold">📍 Chọn vị trí GPS</span>
                                        <Show when={draft()}>
                                            <span class="shrink-0 text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono truncate max-w-[45vw]">
                                                {fmt(draft())}
                                            </span>
                                        </Show>
                                    </Show>
                                    <Show when={pinMode() === 'click'}>
                                        <span class="text-sm font-bold">🖱️ Click để đặt pin</span>
                                    </Show>
                                </div>

                                {/* Close */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition shrink-0"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* ── Expanded toolbar panel ── */}
                            <Show when={toolbarOpen()}>
                                <div class="border-t border-indigo-800 bg-indigo-900/70 backdrop-blur px-3 py-3 flex flex-col gap-3">

                                    {/* Search row */}
                                    <div class="flex gap-2">
                                        <input
                                            ref={searchInputRef}
                                            class="flex-1 bg-white/10 border border-white/25 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/60 transition"
                                            placeholder="Địa điểm hoặc tọa độ lat, lng..."
                                            value={searchQuery()}
                                            onInput={e => setSearchQuery(e.currentTarget.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        />
                                        <button
                                            class="bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 transition shrink-0"
                                            disabled={searchLoading() || !searchQuery().trim()}
                                            onClick={handleSearch}
                                        >
                                            <Show when={!searchLoading()} fallback={<Icon name="heroicons-outline:refresh" class="w-4 h-4 animate-spin" />}>
                                                <Icon name="heroicons-outline:search" class="w-4 h-4" />
                                            </Show>
                                            Tìm
                                        </button>
                                    </div>

                                    {/* Quick buttons */}
                                    <div class="flex gap-2 flex-wrap">
                                        <button
                                            onClick={handleLocate}
                                            disabled={locating()}
                                            class="flex items-center gap-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 disabled:opacity-50 rounded-xl px-3 py-2 transition active:scale-95"
                                        >
                                            <Show when={!locating()} fallback={<Icon name="heroicons-outline:refresh" class="w-3.5 h-3.5 animate-spin" />}>
                                                <Icon name="heroicons-outline:location-marker" class="w-3.5 h-3.5" />
                                            </Show>
                                            {locating() ? 'Đang tìm...' : 'Vị trí của tôi'}
                                        </button>
                                        <Show when={draft()}>
                                            <button
                                                onClick={handleClear}
                                                class="flex items-center gap-1.5 text-xs font-medium text-red-300 bg-red-500/15 hover:bg-red-500/25 rounded-xl px-3 py-2 transition active:scale-95"
                                            >
                                                <Icon name="heroicons-outline:trash" class="w-3.5 h-3.5" />
                                                Xóa pin
                                            </button>
                                        </Show>
                                    </div>
                                </div>
                            </Show>
                        </div>

                        {/* ── MAP ── */}
                        <div class="flex-1 relative min-h-0">
                            <div ref={mapContainer} class="absolute inset-0" />

                            {/* ── CROSSHAIR — cố định giữa màn hình ── */}
                            <Show when={pinMode() === 'crosshair'}>
                                <div
                                    class="absolute inset-0 flex items-center justify-center pointer-events-none"
                                    style={{ 'z-index': 1000 }}
                                >
                                    {/* Drop-shadow pin shape */}
                                    <div class="relative flex flex-col items-center" style={{ 'margin-top': '-24px' }}>
                                        {/* Pin body */}
                                        <div class="w-9 h-9 rounded-full bg-indigo-600 border-[3px] border-white shadow-lg flex items-center justify-center">
                                            <div class="w-2 h-2 rounded-full bg-white" />
                                        </div>
                                        {/* Pin tail */}
                                        <div class="w-0 h-0" style={{
                                            'border-left': '6px solid transparent',
                                            'border-right': '6px solid transparent',
                                            'border-top': '10px solid #4338ca',
                                            'margin-top': '-1px',
                                        }} />
                                        {/* Shadow on map */}
                                        <div class="w-4 h-1.5 rounded-full bg-black/25 mt-1" />
                                    </div>
                                </div>

                                {/* Live coords — below crosshair */}
                                <GPSCrosshairCoords map={() => mapInstance} />
                            </Show>

                            {/* Toasts */}
                            <div
                                class="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none"
                                style={{ 'z-index': 1200, 'max-width': 'min(340px,90vw)' }}
                            >
                                <For each={toasts()}>
                                    {t => <div class={`${toastCls[t.type]} text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg text-center w-full`}>{t.msg}</div>}
                                </For>
                            </div>
                        </div>

                        {/* ── BOTTOM BAR ── */}
                        <div
                            class="shrink-0 bg-white border-t"
                            style={{ 'padding-bottom': 'env(safe-area-inset-bottom,0px)', 'z-index': 20 }}
                        >
                            <div class="flex items-stretch gap-2 px-3 py-2">

                                {/* Mode toggle: crosshair ↔ click */}
                                <Show when={pinMode() === 'crosshair'}>
                                    {/* Switch sang click mode */}
                                    <button
                                        onClick={() => setPinMode('click')}
                                        class="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition"
                                        title="Chuyển sang click để đặt pin"
                                    >
                                        <Icon name="heroicons-outline:cursor-click" class="w-5 h-5" />
                                        <span class="text-[10px] font-medium">Click</span>
                                    </button>
                                </Show>

                                <Show when={pinMode() === 'click'}>
                                    {/* Switch về crosshair mode */}
                                    <button
                                        onClick={() => setPinMode('crosshair')}
                                        class="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 active:scale-95 transition"
                                        title="Chuyển về crosshair"
                                    >
                                        {/* Crosshair icon */}
                                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="4" />
                                            <line x1="12" y1="2" x2="12" y2="7" stroke-linecap="round" />
                                            <line x1="12" y1="17" x2="12" y2="22" stroke-linecap="round" />
                                            <line x1="2" y1="12" x2="7" y2="12" stroke-linecap="round" />
                                            <line x1="17" y1="12" x2="22" y2="12" stroke-linecap="round" />
                                        </svg>
                                        <span class="text-[10px] font-medium">Crosshair</span>
                                    </button>
                                </Show>

                                {/* PIN button (crosshair mode) — nút chính */}
                                <Show when={pinMode() === 'crosshair'}>
                                    <button
                                        onClick={confirmCrosshair}
                                        class="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition font-bold"
                                    >
                                        <Icon name="heroicons-solid:location-marker" class="w-6 h-6" />
                                        <span class="text-sm">Ghim vị trí này</span>
                                    </button>
                                </Show>

                                {/* Click mode info label */}
                                <Show when={pinMode() === 'click'}>
                                    <div class="flex-1 flex items-center justify-center text-sm text-gray-500 font-medium">
                                        Chạm / click vào bản đồ để đặt pin
                                    </div>
                                </Show>

                                {/* Confirm */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!draft()}
                                    class={mergeClass(
                                        'shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95',
                                        draft()
                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                                    )}
                                >
                                    <Icon name="heroicons-solid:check" class="w-4 h-4" />
                                    <span class="hidden sm:inline">Xác nhận</span>
                                    <span class="sm:hidden">OK</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </Portal>
            </Show>
        </>
    );
}

// ─────────────────────────────────────────────────────────
// GPSCrosshairCoords — tọa độ tâm map real-time
// ─────────────────────────────────────────────────────────

function GPSCrosshairCoords(props: { map: () => L.Map | undefined }) {
    const [coords, setCoords] = createSignal('');
    createEffect(() => {
        const m = props.map(); if (!m) return;
        const update = () => { const c = m.getCenter(); setCoords(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`); };
        update(); m.on('move', update); onCleanup(() => m.off('move', update));
    });
    return (
        <div
            class="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none"
            style={{ top: 'calc(50% + 24px)', 'z-index': 1001 }}
        >
            <div class="bg-black/60 backdrop-blur text-white text-[11px] font-mono px-2.5 py-1 rounded-lg whitespace-nowrap">
                {coords()}
            </div>
        </div>
    );
}