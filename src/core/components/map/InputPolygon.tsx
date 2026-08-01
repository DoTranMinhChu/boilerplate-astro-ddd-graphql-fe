// src/core/components/map/InputPolygon.tsx
// Mobile-first: crosshair/reticle draw + collapsible top toolbar

import { createSignal, createEffect, onCleanup, onMount, Show, splitProps, For } from 'solid-js';
import L from 'leaflet';
import 'leaflet-draw';
import { Icon } from '@shared/components/icons/Icon';
import { Portal } from 'solid-js/web';
import { mergeClass } from '@core/helpers/class';
import { createControl } from '@core/components/control/createControl';
import { toDbPolygon, toLeafletPolygon } from './geoHelper';
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
L.drawLocal.draw.toolbar.buttons.polygon = 'Vẽ vùng';
L.drawLocal.draw.toolbar.actions.text = 'Hủy';
L.drawLocal.draw.toolbar.finish.text = 'Hoàn tất';
L.drawLocal.draw.toolbar.undo.text = 'Xóa điểm';
L.drawLocal.draw.handlers.polygon.tooltip.start = 'Click để bắt đầu';
L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Click để tiếp tục';
L.drawLocal.draw.handlers.polygon.tooltip.end = 'Click điểm đầu để đóng';
L.drawLocal.edit.toolbar.actions.save.text = 'Lưu';
L.drawLocal.edit.toolbar.actions.cancel.text = 'Hủy';
L.drawLocal.edit.toolbar.buttons.edit = 'Chỉnh sửa';
L.drawLocal.edit.toolbar.buttons.editDisabled = 'Không có vùng';
L.drawLocal.edit.toolbar.buttons.remove = 'Xóa vùng';
L.drawLocal.edit.toolbar.buttons.removeDisabled = 'Không có vùng';

// Types
export type PolygonPreviewMode = 'map' | 'text' | 'icon';
type DrawMode = 'idle' | 'crosshair' | 'classic' | 'edit';
export interface PolygonSuggestion { coordinates: [number, number][]; label?: string; description?: string; }
export interface ReferencePolygon { coordinates: [number, number][]; label?: string; }
export interface InputPolygonProps extends FormControlProps<number[][]> {
    placeholder?: string; height?: string; previewMode?: PolygonPreviewMode;
    initialCenter?: [number, number] | null; referencePolygons?: ReferencePolygon[];
    suggestPolygon?: (lat: number, lng: number) => Promise<PolygonSuggestion>;
}
interface Toast { id: number; msg: string; type: 'info' | 'success' | 'warn' | 'error'; }
let _tid = 0;

function calcArea(coords: [number, number][]): string | null {
    if (coords.length < 3) return null;
    const R = 6_371_000; let area = 0; const n = coords.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const [la1, lo1] = coords[i]; const [la2, lo2] = coords[j];
        area += (lo1 * (Math.PI / 180) * Math.cos(la1 * (Math.PI / 180)) * R) * (la2 * (Math.PI / 180) * R)
            - (lo2 * (Math.PI / 180) * Math.cos(la2 * (Math.PI / 180)) * R) * (la1 * (Math.PI / 180) * R);
    }
    const m2 = Math.abs(area) / 2;
    return m2 >= 10_000 ? `${(m2 / 10_000).toFixed(2)} ha` : `${Math.round(m2).toLocaleString('vi-VN')} m²`;
}

export function InputPolygon(props: InputPolygonProps) {
    const [local] = splitProps(props, ['height', 'placeholder', 'class', 'readOnly', 'previewMode', 'suggestPolygon', 'initialCenter', 'referencePolygons']);
    const { value, onChange, readOnly, error } = createControl<number[][]>('object', props);
    const previewMode = (): PolygonPreviewMode => local.previewMode ?? 'map';

    const [isOpen, setIsOpen] = createSignal(false);
    const [drawMode, setDrawMode] = createSignal<DrawMode>('idle');
    const [toolbarOpen, setToolbarOpen] = createSignal(false);
    const [searchQuery, setSearchQuery] = createSignal('');
    const [searchLoading, setSearchLoading] = createSignal(false);
    const [locating, setLocating] = createSignal(false);
    const [currentPolygon, setCurrentPolygon] = createSignal<[number, number][]>([]);
    const [crosshairPts, setCrosshairPts] = createSignal<[number, number][]>([]);
    const [toasts, setToasts] = createSignal<Toast[]>([]);
    const [suggestion, setSuggestion] = createSignal<PolygonSuggestion | null>(null);
    const [showingSuggest, setShowingSuggest] = createSignal(false);
    const [suggestLoading, setSuggestLoading] = createSignal(false);

    let previewContainer: HTMLDivElement | undefined;
    let mapContainer: HTMLDivElement | undefined;
    let searchInputRef: HTMLInputElement | undefined;
    let previewMap: L.Map | undefined;
    let mapInstance: L.Map | undefined;
    let drawnItems: L.FeatureGroup | undefined;
    let drawControl: L.Control.Draw | undefined;
    let suggestLayer: L.Polygon | undefined;
    let centerMarker: L.Marker | undefined;
    let referenceLayers: L.Polygon[] = [];
    let deviceDot: L.CircleMarker | undefined;
    let deviceRing: L.Circle | undefined;
    let editHandler: any = null;
    let chPolyline: L.Polyline | undefined;
    let chCloseLine: L.Polyline | undefined;
    let chMarkers: L.CircleMarker[] = [];

    const toast = (msg: string, type: Toast['type'] = 'info', ms = 2800) => {
        const id = ++_tid;
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms);
    };
    const toastCls: Record<Toast['type'], string> = { info: 'bg-gray-800', success: 'bg-green-600', warn: 'bg-amber-500', error: 'bg-red-600' };

    const extractLatLngs = (layer: L.Polygon): L.LatLng[] => {
        const lls = layer.getLatLngs() as any;
        if (!lls.length) return [];
        const first = lls[0];
        if (typeof first?.lat === 'number') return lls;
        const ring = first;
        if (Array.isArray(ring) && ring.length > 0) {
            if (typeof ring[0]?.lat === 'number') return ring;
            return ring[0] || [];
        }
        return [];
    };
    const updateCoordsFromLayer = (layer: L.Polygon) => setCurrentPolygon(extractLatLngs(layer).map(p => [p.lat, p.lng]));
    const hasValue = () => Array.isArray(value()) && (value() as any[]).length >= 3;
    const leafletCoords = (): [number, number][] => { try { return hasValue() ? toLeafletPolygon(value()) : []; } catch { return []; } };

    const gpsIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 2px #3b82f6"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    const placeInitialCenterMarker = () => { const ic = local.initialCenter; if (!ic || !mapInstance) return; centerMarker?.remove(); centerMarker = L.marker(ic, { icon: gpsIcon, zIndexOffset: 900, interactive: false }).bindTooltip('📍 GPS', { permanent: false, direction: 'top' }).addTo(mapInstance); };
    const flyToInitialCenter = () => { const ic = local.initialCenter; if (!ic || !mapInstance) return; mapInstance.flyTo(ic, 17, { animate: true, duration: 0.6 }); setToolbarOpen(false); };

    const drawReferenceLayers = () => {
        if (!mapInstance) return;
        for (const l of referenceLayers) l.remove(); referenceLayers = [];
        for (const ref of local.referencePolygons ?? []) {
            if (!ref.coordinates?.length) continue;
            const poly = L.polygon(ref.coordinates as L.LatLngExpression[], { color: '#7c3aed', weight: 1.5, fillColor: '#7c3aed', fillOpacity: 0.08, dashArray: '4 3' }).addTo(mapInstance);
            if (ref.label) poly.bindTooltip(ref.label, { sticky: true });
            referenceLayers.push(poly);
        }
    };

    // ── CROSSHAIR DRAW ──
    const refreshCrosshairPreview = (pts: [number, number][]) => {
        if (!mapInstance) return;
        chPolyline?.remove(); chCloseLine?.remove(); for (const m of chMarkers) m.remove(); chMarkers = [];
        if (!pts.length) return;
        pts.forEach((p, i) => { const m = L.circleMarker(p, { radius: i === 0 ? 8 : 5, color: i === 0 ? '#22c55e' : '#ef4444', fillColor: i === 0 ? '#22c55e' : '#fff', fillOpacity: 1, weight: 2, interactive: false }).addTo(mapInstance!); chMarkers.push(m); });
        if (pts.length >= 2) chPolyline = L.polyline(pts, { color: '#ef4444', weight: 2.5, interactive: false }).addTo(mapInstance!);
        if (pts.length >= 3) chCloseLine = L.polyline([pts[pts.length - 1], pts[0]], { color: '#ef4444', weight: 2, dashArray: '6 4', interactive: false }).addTo(mapInstance!);
    };
    const startCrosshairMode = () => { cancelAllModes(); setDrawMode('crosshair'); setCrosshairPts([]); toast('Kéo bản đồ đến vị trí, nhấn ⊕ để chấm điểm', 'info', 4000); };
    const crosshairAddPoint = () => { if (!mapInstance) return; const c = mapInstance.getCenter(); const pts = [...crosshairPts(), [c.lat, c.lng] as [number, number]]; setCrosshairPts(pts); refreshCrosshairPreview(pts); };
    const crosshairUndo = () => { const pts = crosshairPts().slice(0, -1); setCrosshairPts(pts); refreshCrosshairPreview(pts); if (!pts.length) setDrawMode('idle'); };
    const crosshairFinish = () => {
        const pts = crosshairPts(); if (pts.length < 3) { toast('Cần ít nhất 3 điểm', 'warn'); return; }
        chPolyline?.remove(); chPolyline = undefined; chCloseLine?.remove(); chCloseLine = undefined; for (const m of chMarkers) m.remove(); chMarkers = [];
        drawnItems?.clearLayers(); const poly = L.polygon(pts, { color: '#ef4444', weight: 2, fillOpacity: 0.15 }); drawnItems?.addLayer(poly);
        setCurrentPolygon(pts); setCrosshairPts([]); setDrawMode('idle');
        toast(`✓ Vùng ${pts.length} điểm${calcArea(pts) ? ` — ≈ ${calcArea(pts)}` : ''}`, 'success');
    };
    const cancelCrosshairMode = () => {
        chPolyline?.remove(); chPolyline = undefined; chCloseLine?.remove(); chCloseLine = undefined; for (const m of chMarkers) m.remove(); chMarkers = [];
        setCrosshairPts([]); if (drawMode() === 'crosshair') setDrawMode('idle');
    };

    const startClassicDraw = () => { cancelAllModes(); setDrawMode('classic'); setTimeout(() => (document.querySelector('.leaflet-draw-draw-polygon') as HTMLElement | null)?.click(), 50); };

    const startEditMode = () => {
        if (!mapInstance || !drawnItems) return; cancelAllModes(); setDrawMode('edit');
        editHandler = new (L.EditToolbar.Edit as any)(mapInstance, { featureGroup: drawnItems, selectedPathOptions: { dashArray: '10,10', fill: true, fillColor: '#fe57a1', fillOpacity: 0.1, maintainColor: false } });
        editHandler.enable(); drawnItems.eachLayer((l: any) => l.on('edit', () => updateCoordsFromLayer(l as L.Polygon)));
    };
    const saveEditMode = () => { if (!editHandler) return; editHandler.save(); editHandler.disable(); editHandler = null; setDrawMode('idle'); drawnItems?.eachLayer(l => updateCoordsFromLayer(l as L.Polygon)); toast('Đã lưu chỉnh sửa', 'success'); };
    const cancelEditMode = () => { if (!editHandler) return; editHandler.revertLayers(); editHandler.disable(); editHandler = null; setDrawMode('idle'); };
    const cancelAllModes = () => { cancelCrosshairMode(); if (editHandler) cancelEditMode(); };

    const removeSuggestLayer = () => { if (suggestLayer && mapInstance) { mapInstance.removeLayer(suggestLayer); suggestLayer = undefined; } };
    const fetchSuggest = async (lat: number, lng: number) => {
        if (!local.suggestPolygon || !mapInstance || drawMode() !== 'idle') return;
        setSuggestLoading(true); removeSuggestLayer();
        try {
            const result = await local.suggestPolygon(lat, lng); if (!result.coordinates?.length) throw new Error('Không có dữ liệu');
            setSuggestion(result); setShowingSuggest(true);
            suggestLayer = L.polygon(result.coordinates as L.LatLngExpression[], { color: '#3b82f6', weight: 2.5, fillColor: '#3b82f6', fillOpacity: 0.18, dashArray: '6 4' }).addTo(mapInstance!);
            mapInstance?.fitBounds(suggestLayer.getBounds(), { padding: [48, 48], maxZoom: 18 });
        } catch (err: any) { toast(err?.message ?? 'Không tìm được thửa đất', 'error'); }
        finally { setSuggestLoading(false); }
    };
    const applySuggestion = () => {
        const sug = suggestion(); if (!sug || !drawnItems) return;
        drawnItems.clearLayers(); removeSuggestLayer();
        const poly = L.polygon(sug.coordinates as L.LatLngExpression[], { color: '#ef4444', weight: 2, fillOpacity: 0.15 }); drawnItems.addLayer(poly); updateCoordsFromLayer(poly);
        setShowingSuggest(false); setSuggestion(null); startEditMode(); toast('Đã áp dụng, kéo góc để chỉnh', 'success');
    };

    const handleSearch = async () => {
        const q = searchQuery().trim(); if (!q || !mapInstance) return;
        const parts = q.split(/[,\s]+/);
        if (parts.length >= 2) { const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]); if (!isNaN(lat) && !isNaN(lng)) { mapInstance.flyTo([lat, lng], 17, { animate: true, duration: 0.8 }); setToolbarOpen(false); if (local.suggestPolygon) await fetchSuggest(lat, lng); return; } }
        setSearchLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, { headers: { 'Accept-Language': 'vi,en' } });
            const data = await res.json();
            if (data?.[0]) { mapInstance.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 16, { animate: true, duration: 0.8 }); setToolbarOpen(false); if (local.suggestPolygon) await fetchSuggest(parseFloat(data[0].lat), parseFloat(data[0].lon)); }
            else toast('Không tìm thấy địa điểm', 'warn');
        } catch { toast('Lỗi kết nối', 'error'); } finally { setSearchLoading(false); }
    };

    const handleLocate = () => {
        if (!mapInstance || !('geolocation' in navigator)) { toast('Không hỗ trợ GPS', 'error'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
                mapInstance!.flyTo([lat, lng], 18, { animate: true, duration: 0.9 }); deviceDot?.remove(); deviceRing?.remove();
                deviceRing = L.circle([lat, lng], { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1.5, dashArray: '4 3', interactive: false }).addTo(mapInstance!);
                deviceDot = L.circleMarker([lat, lng], { radius: 8, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 3, interactive: false }).addTo(mapInstance!);
                setLocating(false); setToolbarOpen(false); toast('Đã tìm vị trí của bạn', 'success');
            },
            (err) => { setLocating(false); toast(['', 'Bị chặn quyền GPS', 'Không xác định vị trí', 'Hết thời gian GPS'][err.code] ?? 'Lỗi GPS', 'error'); },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        );
    };

    const destroyPreviewMap = () => { previewMap?.remove(); previewMap = undefined; };
    const initPreviewMap = () => {
        if (previewMode() !== 'map' || !previewContainer) return; destroyPreviewMap();
        const coords = leafletCoords(); if (coords.length < 3) return;
        const lats = coords.map(p => p[0]), lngs = coords.map(p => p[1]);
        const center: L.LatLngExpression = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
        previewMap = L.map(previewContainer, { zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false }).setView(center, 15);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(previewMap);
        const poly = L.polygon(coords, { color: '#22c55e', weight: 2.5, fillColor: '#22c55e', fillOpacity: 0.28 }).addTo(previewMap);
        previewMap.fitBounds(poly.getBounds(), { padding: [16, 16] }); setTimeout(() => previewMap?.invalidateSize(), 60);
    };

    const initMap = () => {
        if (!mapContainer || mapInstance) return;
        const coords = leafletCoords(); let center: L.LatLngExpression = [10.8231, 106.6297]; let zoom = 14;
        if (coords.length >= 3) { const lats = coords.map(p => p[0]), lngs = coords.map(p => p[1]); center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]; setCurrentPolygon(coords); }
        else if (local.initialCenter) { center = local.initialCenter; zoom = 17; }
        mapInstance = L.map(mapContainer, { doubleClickZoom: true }).setView(center, zoom);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '©Google' }).addTo(mapInstance);
        drawnItems = new L.FeatureGroup(); mapInstance.addLayer(drawnItems); drawReferenceLayers(); placeInitialCenterMarker();
        if (coords.length >= 3) { const p = L.polygon(coords, { color: '#ef4444', weight: 2, fillOpacity: 0.15 }); drawnItems.addLayer(p); mapInstance.fitBounds(p.getBounds(), { padding: [40, 40] }); }
        if (!readOnly()) {
            drawControl = new L.Control.Draw({ position: 'topleft', draw: { polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: '#ef4444', weight: 2, fillOpacity: 0.15 } }, marker: false, circle: false, circlemarker: false, polyline: false, rectangle: false }, edit: { featureGroup: drawnItems, remove: true } });
            mapInstance.addControl(drawControl);
            mapInstance.on(L.Draw.Event.CREATED, (e: any) => { drawnItems!.clearLayers(); drawnItems!.addLayer(e.layer as L.Polygon); updateCoordsFromLayer(e.layer as L.Polygon); setDrawMode('idle'); toast('✓ Đã vẽ vùng', 'success'); });
            mapInstance.on(L.Draw.Event.EDITED, (e: any) => (e.layers as L.LayerGroup).eachLayer(l => updateCoordsFromLayer(l as L.Polygon)));
            mapInstance.on(L.Draw.Event.DELETED, () => setCurrentPolygon([]));
            mapInstance.on(L.Draw.Event.DRAWSTART, () => { mapInstance?.doubleClickZoom.disable(); setDrawMode('classic'); });
            mapInstance.on(L.Draw.Event.DRAWSTOP, () => { mapInstance?.doubleClickZoom.enable(); setDrawMode('idle'); });
            if (local.suggestPolygon) mapInstance.on('click', async (e: L.LeafletMouseEvent) => { if (drawMode() !== 'idle') return; await fetchSuggest(e.latlng.lat, e.latlng.lng); });
        }
    };
    const destroyDrawMap = () => {
        if (!mapInstance) return; cancelAllModes(); deviceDot?.remove(); deviceRing?.remove(); removeSuggestLayer(); centerMarker?.remove(); centerMarker = undefined;
        mapInstance.off(); if (drawControl) { try { mapInstance.removeControl(drawControl); } catch { } drawControl = undefined; } mapInstance.remove(); mapInstance = undefined; drawnItems = undefined;
    };

    const handleConfirm = () => {
        if (drawMode() === 'edit') saveEditMode(); if (drawMode() === 'crosshair') crosshairFinish();
        const coords = currentPolygon(); onChange(coords.length >= 3 ? toDbPolygon(coords.map(([lat, lng]) => ({ lat, lng }))) as any : [] as any); setIsOpen(false);
    };
    const handleClear = () => { drawnItems?.clearLayers(); setCurrentPolygon([]); cancelAllModes(); toast('Đã xóa vùng', 'info'); };

    onMount(() => { const t = setTimeout(initPreviewMap, 120); onCleanup(() => { clearTimeout(t); destroyPreviewMap(); }); });
    createEffect(() => { value(); if (!isOpen()) { const t = setTimeout(initPreviewMap, 180); onCleanup(() => clearTimeout(t)); } });
    createEffect(() => {
        if (isOpen()) { const t = setTimeout(() => { initMap(); mapInstance?.invalidateSize(); }, 80); onCleanup(() => clearTimeout(t)); }
        else { destroyDrawMap(); setSearchQuery(''); setSuggestion(null); setShowingSuggest(false); setDrawMode('idle'); setToolbarOpen(false); }
    });
    createEffect(() => { if (toolbarOpen()) setTimeout(() => searchInputRef?.focus(), 60); });

    const isCrosshair = () => drawMode() === 'crosshair';
    const isEdit = () => drawMode() === 'edit';
    const chCount = () => crosshairPts().length;
    const polyCount = () => currentPolygon().length;

    return (
        <>
            {/* PREVIEW */}
            <div
                class={mergeClass('border rounded-lg overflow-hidden relative group cursor-pointer transition hover:border-indigo-400 hover:shadow-md', error() ? 'border-red-400' : hasValue() ? 'border-green-400' : 'border-gray-300 bg-gray-50', readOnly() ? 'cursor-default' : '', local.class)}
                style={{ height: local.height || (previewMode() === 'icon' ? '64px' : '180px') }}
                onClick={() => !readOnly() && setIsOpen(true)}
            >
                <Show when={hasValue()} fallback={
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
                        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><Icon name="heroicons-outline:map" class="w-7 h-7 text-gray-400" /></div>
                        <span class="text-sm font-medium text-gray-500">Chưa có vùng sản xuất</span>
                        {!readOnly() && <span class="text-xs text-indigo-500 underline">Bấm để bắt đầu vẽ</span>}
                    </div>
                }>
                    <Show when={previewMode() === 'map'}>
                        <div ref={previewContainer} class="absolute inset-0" style={{ 'z-index': 0 }} />
                        <div class="absolute inset-x-0 bottom-0 pointer-events-none" style={{ 'z-index': 500, background: 'linear-gradient(to top,rgba(0,0,0,.76) 0%,rgba(0,0,0,.34) 55%,transparent 100%)' }}>
                            <div class="px-3 py-2.5 flex items-end justify-between">
                                <div>
                                    <div class="flex items-center gap-1.5"><Icon name="heroicons-solid:check-circle" class="w-4 h-4 text-green-400" /><span class="text-xs font-semibold text-white">{(value() as any)?.length || 0} điểm</span></div>
                                    <Show when={calcArea(leafletCoords())}><span class="text-[11px] text-green-300 pl-[22px]">≈ {calcArea(leafletCoords())}</span></Show>
                                </div>
                                {!readOnly() && <div class="text-xs font-semibold text-white bg-white/20 hover:bg-white/35 border border-white/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Icon name="heroicons-outline:pencil" class="w-3.5 h-3.5" />Sửa</div>}
                            </div>
                        </div>
                        <div class="absolute inset-0" style={{ 'z-index': 400 }} />
                    </Show>
                    <Show when={previewMode() === 'icon'}>
                        <div class="absolute inset-0 flex items-center px-4 gap-3">
                            <div class="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0"><Icon name="heroicons-solid:map" class="w-5 h-5 text-green-600" /></div>
                            <div class="flex-1 min-w-0"><div class="flex items-center gap-1.5"><span class="text-sm font-semibold text-gray-800">Vùng sản xuất</span><span class="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{leafletCoords().length} điểm</span></div><Show when={calcArea(leafletCoords())}><div class="text-xs text-gray-500">≈ {calcArea(leafletCoords())}</div></Show></div>
                        </div>
                    </Show>
                </Show>
            </div>
            <Show when={error()}><div class="text-xs text-red-500 mt-1">{error()}</div></Show>

            {/* MODAL */}
            <Show when={isOpen()}>
                <Portal>
                    <div class="fixed inset-0 flex flex-col bg-gray-900" style={{ 'z-index': 9000 }}>

                        {/* TOP BAR */}
                        <div class="shrink-0 bg-[#b91c1c] text-white shadow-md" style={{ 'z-index': 20 }}>
                            <div class="flex items-center gap-2 px-3 h-12">
                                <button onClick={() => setToolbarOpen(o => !o)} class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition shrink-0">
                                    <Show when={toolbarOpen()} fallback={<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>}>
                                        <Icon name="heroicons-outline:x" class="w-5 h-5" />
                                    </Show>
                                </button>
                                <div class="flex-1 min-w-0 flex items-center gap-2">
                                    <Show when={isCrosshair()}>
                                        <span class="text-sm font-bold">⊕ Chấm điểm</span>
                                        <span class="shrink-0 text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono">{chCount()} điểm{chCount() >= 3 ? ' ✓' : ` · cần ${3 - chCount()} nữa`}</span>
                                    </Show>
                                    <Show when={isEdit()}><span class="text-sm font-bold text-amber-200">✏️ Chỉnh sửa góc</span></Show>
                                    <Show when={!isCrosshair() && !isEdit()}>
                                        <span class="text-sm font-bold truncate">Vẽ vùng sản xuất</span>
                                        <Show when={polyCount() >= 3}><span class="shrink-0 text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{polyCount()} điểm{calcArea(currentPolygon()) ? ` · ${calcArea(currentPolygon())}` : ''}</span></Show>
                                    </Show>
                                </div>
                                <button onClick={() => setIsOpen(false)} class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition shrink-0">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Expanded toolbar */}
                            <Show when={toolbarOpen()}>
                                <div class="border-t border-red-800 bg-[#991b1b] px-3 py-3 flex flex-col gap-3">
                                    <div class="flex gap-2">
                                        <input ref={searchInputRef} class="flex-1 bg-white/10 border border-white/25 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/60 transition" placeholder="Địa điểm hoặc lat, lng..." value={searchQuery()} onInput={e => setSearchQuery(e.currentTarget.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                                        <button class="bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 transition shrink-0" disabled={searchLoading() || !searchQuery().trim()} onClick={handleSearch}>
                                            <Show when={!searchLoading()} fallback={<Icon name="heroicons-outline:refresh" class="w-4 h-4 animate-spin" />}><Icon name="heroicons-outline:search" class="w-4 h-4" /></Show>
                                            Tìm
                                        </button>
                                    </div>
                                    <div class="flex gap-2 flex-wrap">
                                        <button onClick={handleLocate} disabled={locating()} class="flex items-center gap-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 disabled:opacity-50 rounded-xl px-3 py-2 transition active:scale-95">
                                            <Show when={!locating()} fallback={<Icon name="heroicons-outline:refresh" class="w-3.5 h-3.5 animate-spin" />}><Icon name="heroicons-outline:location-marker" class="w-3.5 h-3.5" /></Show>
                                            {locating() ? 'Đang tìm...' : 'Vị trí tôi'}
                                        </button>
                                        <Show when={local.initialCenter}><button onClick={flyToInitialCenter} class="flex items-center gap-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 transition active:scale-95">📍 Về GPS</button></Show>
                                        <Show when={(local.referencePolygons?.length ?? 0) > 0}>
                                            <div class="flex items-center gap-1.5 text-xs text-white/60 bg-white/10 rounded-xl px-3 py-2">
                                                <span class="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: 'rgba(167,139,250,0.35)', border: '1.5px dashed #a78bfa' }} />
                                                {local.referencePolygons!.length} vùng khác
                                            </div>
                                        </Show>
                                    </div>
                                </div>
                            </Show>
                        </div>

                        {/* MAP */}
                        <div class="flex-1 relative min-h-0">
                            <div ref={mapContainer} class="absolute inset-0" />

                            {/* CROSSHAIR RETICLE */}
                            <Show when={isCrosshair()}>
                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ 'z-index': 1000 }}>
                                    <div class="relative">
                                        <div class="w-11 h-11 rounded-full border-[2.5px] border-red-500 opacity-80" />
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-px bg-red-500" />
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-7 bg-red-500" />
                                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                                    </div>
                                </div>
                                <CrosshairCoords map={() => mapInstance} />
                            </Show>

                            <Show when={suggestLoading()}>
                                <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow flex items-center gap-2 pointer-events-none" style={{ 'z-index': 1100 }}>
                                    <Icon name="heroicons-outline:refresh" class="w-3.5 h-3.5 animate-spin" />Đang tra cứu...
                                </div>
                            </Show>

                            <Show when={showingSuggest() && suggestion() && !suggestLoading()}>
                                <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-blue-200 p-3 flex flex-col gap-2" style={{ 'z-index': 1100, width: 'min(320px,calc(100vw - 20px))' }}>
                                    <div class="flex items-start gap-2">
                                        <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Icon name="heroicons-solid:map" class="w-4 h-4 text-blue-600" /></div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-bold text-gray-800 truncate">{suggestion()!.label ?? 'Thửa đất tìm thấy'}</p>
                                            <Show when={suggestion()!.description}><p class="text-[11px] text-gray-500 truncate">{suggestion()!.description}</p></Show>
                                            <p class="text-[11px] text-blue-600">{suggestion()!.coordinates.length} điểm{calcArea(suggestion()!.coordinates) ? ` — ≈ ${calcArea(suggestion()!.coordinates)}` : ''}</p>
                                        </div>
                                        <button onClick={() => { removeSuggestLayer(); setShowingSuggest(false); setSuggestion(null); }} class="p-1 text-gray-400 hover:text-gray-600"><Icon name="heroicons-outline:x" class="w-4 h-4" /></button>
                                    </div>
                                    <button onClick={applySuggestion} class="w-full py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 transition"><Icon name="heroicons-solid:check" class="w-4 h-4" />Áp dụng & chỉnh sửa</button>
                                </div>
                            </Show>

                            {/* Toasts */}
                            <div class="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none" style={{ 'z-index': 1200, 'max-width': 'min(340px,90vw)' }}>
                                <For each={toasts()}>{t => <div class={`${toastCls[t.type]} text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg text-center w-full`}>{t.msg}</div>}</For>
                            </div>
                        </div>

                        {/* BOTTOM BAR */}
                        <div class="shrink-0 bg-white border-t" style={{ 'padding-bottom': 'env(safe-area-inset-bottom,0px)', 'z-index': 20 }}>

                            {/* Crosshair mode */}
                            <Show when={isCrosshair()}>
                                <div class="flex items-stretch gap-2 px-3 py-2">
                                    <button onClick={crosshairUndo} disabled={chCount() === 0} class="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[52px] rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50 active:scale-95 transition">
                                        <Icon name="heroicons-outline:arrow-left" class="w-5 h-5" /><span class="text-[10px] font-medium">Hoàn tác</span>
                                    </button>
                                    <button onClick={() => { cancelCrosshairMode(); setDrawMode('idle'); }} class="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[52px] rounded-xl border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 transition">
                                        <Icon name="heroicons-outline:x" class="w-5 h-5" /><span class="text-[10px] font-medium">Hủy</span>
                                    </button>
                                    {/* CHẤM ĐIỂM — nút chính */}
                                    <button onClick={crosshairAddPoint} class="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white shadow-md active:scale-95 transition font-bold">
                                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="7" stroke-linecap="round" /><line x1="12" y1="17" x2="12" y2="22" stroke-linecap="round" /><line x1="2" y1="12" x2="7" y2="12" stroke-linecap="round" /><line x1="17" y1="12" x2="22" y2="12" stroke-linecap="round" /></svg>
                                        <span class="text-sm">Chấm điểm</span>
                                    </button>
                                    <Show when={chCount() >= 3}>
                                        <button onClick={crosshairFinish} class="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow active:scale-95 transition">
                                            <Icon name="heroicons-solid:check" class="w-5 h-5" /><span class="text-[10px] font-bold">Xong</span>
                                        </button>
                                    </Show>
                                </div>
                            </Show>

                            {/* Edit mode */}
                            <Show when={isEdit()}>
                                <div class="flex gap-2 px-3 py-2">
                                    <button onClick={cancelEditMode} class="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Hủy</button>
                                    <button onClick={saveEditMode} class="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow transition">Lưu chỉnh sửa</button>
                                </div>
                            </Show>

                            {/* Idle / classic */}
                            <Show when={!isCrosshair() && !isEdit()}>
                                <div class="flex items-center gap-2 px-3 py-2">
                                    <div class="flex gap-1.5 flex-1 overflow-x-auto">
                                        <BottomTool
                                            icon={<svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="7" stroke-linecap="round" /><line x1="12" y1="17" x2="12" y2="22" stroke-linecap="round" /><line x1="2" y1="12" x2="7" y2="12" stroke-linecap="round" /><line x1="17" y1="12" x2="22" y2="12" stroke-linecap="round" /></svg>}
                                            label="Chấm vẽ" color="red" disabled={readOnly()} onClick={startCrosshairMode}
                                        />
                                        <BottomTool icon={<Icon name="heroicons-outline:pencil-alt" class="w-[18px] h-[18px]" />} label="Vẽ tay" active={drawMode() === 'classic'} color="red" disabled={readOnly()} onClick={startClassicDraw} />
                                        <Show when={polyCount() >= 3}>
                                            <div class="w-px h-8 bg-gray-200 self-center mx-0.5 shrink-0" />
                                            <BottomTool icon={<Icon name="heroicons-outline:adjustments" class="w-[18px] h-[18px]" />} label="Chỉnh góc" color="amber" disabled={readOnly()} onClick={startEditMode} />
                                            <BottomTool icon={<Icon name="heroicons-outline:trash" class="w-[18px] h-[18px]" />} label="Xóa" color="red" onClick={handleClear} />
                                        </Show>
                                    </div>
                                    <button
                                        onClick={handleConfirm} disabled={polyCount() < 3}
                                        class={mergeClass('shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95', polyCount() >= 3 ? 'bg-red-700 hover:bg-red-800 text-white shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
                                    >
                                        <Icon name="heroicons-solid:check" class="w-4 h-4" />
                                        <span class="hidden sm:inline">Lưu vùng</span>
                                        <span class="sm:hidden">Lưu</span>
                                    </button>
                                </div>
                            </Show>
                        </div>
                    </div>
                </Portal>
            </Show>
        </>
    );
}

function CrosshairCoords(props: { map: () => L.Map | undefined }) {
    const [coords, setCoords] = createSignal('');
    createEffect(() => {
        const m = props.map(); if (!m) return;
        const update = () => { const c = m.getCenter(); setCoords(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`); };
        update(); m.on('move', update); onCleanup(() => m.off('move', update));
    });
    return (
        <div class="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none" style={{ top: 'calc(50% + 30px)', 'z-index': 1001 }}>
            <div class="bg-black/60 backdrop-blur text-white text-[11px] font-mono px-2.5 py-1 rounded-lg whitespace-nowrap">{coords()}</div>
        </div>
    );
}

interface BottomToolProps { icon: any; label: string; active?: boolean; disabled?: boolean; color?: 'red' | 'amber' | 'blue' | 'default'; onClick?: () => void; }
function BottomTool(p: BottomToolProps) {
    const activeMap = { red: 'bg-red-50 border-red-400 text-red-700', amber: 'bg-amber-50 border-amber-400 text-amber-700', blue: 'bg-blue-50 border-blue-400 text-blue-700', default: 'bg-gray-100 border-gray-400 text-gray-800' };
    return (
        <button onClick={p.disabled ? undefined : p.onClick} class={mergeClass('shrink-0 flex flex-col items-center justify-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-xl border transition active:scale-95 select-none', p.disabled ? 'opacity-30 cursor-not-allowed border-transparent text-gray-400' : p.active ? activeMap[p.color ?? 'default'] : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>
            {p.icon}
            <span class="text-[10px] font-medium leading-none mt-0.5">{p.label}</span>
        </button>
    );
}