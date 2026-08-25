export interface ChartPoint {
    label: string;
    value: number;
}

export interface ChartSeriesConfig {
    mode: 'static' | 'repeat';
    /** Deliberately `unknown`, not `ChartPoint[]` — this is whatever the Inspector's
     * `staticSeries` field actually persisted into `node.props`, which the type system
     * cannot vouch for. Final-review fix (Critical): the field used to be a `code`
     * control, i.e. a plain textarea whose onChange writes the RAW STRING the admin
     * typed with no parse step anywhere, so `points()` was a `string` and every
     * consumer (`buildLinePath`, the `<For>` legend loop) threw `points.map is not a
     * function` on the DEFAULT authoring path. The field is now a `repeater`
     * (nodeRegistry.ts) producing a real array of rows, but `normalizeStaticSeries`
     * below still tolerates the legacy JSON-string shape so Charts authored before
     * that change keep rendering instead of silently breaking. */
    staticSeries?: unknown;
    labelField?: string;
    valueField?: string;
}

function toChartPoint(row: unknown, index: number): ChartPoint {
    const data = (row ?? {}) as Record<string, unknown>;
    const rawLabel = data.label;
    const label = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : String(index + 1);
    const rawValue = data.value;
    const numericValue = typeof rawValue === 'string' ? Number(rawValue) : rawValue;
    const value = typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : 0;
    return { label, value };
}

/** Coerces whatever `node.props.staticSeries` holds into a real ChartPoint[]. Accepts the
 * current repeater shape (array of `{label, value}` rows, where a freshly-added row has
 * `value: undefined` until the admin types into it), and the legacy `code`-control shape
 * (a raw JSON string). NEVER throws — malformed JSON, a non-array parse result, or rows
 * missing either key all degrade to an empty series / `value: 0` rather than breaking the
 * whole chart (and, via the per-node ErrorBoundary, the whole surrounding branch). */
export function normalizeStaticSeries(staticSeries: unknown): ChartPoint[] {
    let raw = staticSeries;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        try {
            raw = JSON.parse(trimmed);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(raw)) return [];
    return raw.map(toChartPoint);
}

/** Turns either a hand-entered static series or a batch of repeat-bound ContentEntry
 * rows into a flat [{label, value}] series a Chart primitive can render directly. Never
 * throws on missing/non-numeric fields — a misconfigured or partially-filled entry
 * degrades to value:0 rather than breaking the whole chart. */
export function resolveChartSeries(config: ChartSeriesConfig, entries: Record<string, any>[]): ChartPoint[] {
    if (config.mode === 'static') {
        return normalizeStaticSeries(config.staticSeries);
    }

    return entries.map((entry, i) => {
        const data = entry.data ?? {};
        const rawLabel = config.labelField ? data[config.labelField] : undefined;
        const label = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : String(i + 1);
        const rawValue = config.valueField ? data[config.valueField] : undefined;
        const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0;
        return { label, value };
    });
}
