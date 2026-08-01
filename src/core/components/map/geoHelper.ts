// src/core/components/map/geoHelper.ts

// DB: [Lng, Lat] (GeoJSON) <-> Leaflet: [Lat, Lng]

export const toLeafletPoint = (coord: any): [number, number] | null => {
    if (!coord) return null;
    if (Array.isArray(coord) && coord.length >= 2) return [coord[1], coord[0]];
    if (coord.lat && coord.lng) return [coord.lat, coord.lng];
    return null;
};

export const toDbPoint = (lat: number, lng: number): [number, number] => {
    return [lng, lat];
};

export const toLeafletPolygon = (coords: any[]): [number, number][] => {
    if (!coords || !Array.isArray(coords)) return [];
    // Handle nested GeoJSON arrays if necessary
    const flatCoords = (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) ? coords[0] : coords;
    return flatCoords.map((c: any) => toLeafletPoint(c) as [number, number]);
};

export const toDbPolygon = (latLngs: { lat: number, lng: number }[]): number[][] => {
    const coords = latLngs.map(p => [p.lng, p.lat]);
    // Ensure closed ring for Polygon
    if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push(first);
        }
    }
    return coords;
};