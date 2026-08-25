export interface ChartPoint {
    label: string;
    value: number;
}

export interface ChartSeriesConfig {
    mode: 'static' | 'repeat';
    staticSeries?: ChartPoint[];
    labelField?: string;
    valueField?: string;
}

/** Turns either a hand-entered static series or a batch of repeat-bound ContentEntry
 * rows into a flat [{label, value}] series a Chart primitive can render directly. Never
 * throws on missing/non-numeric fields — a misconfigured or partially-filled entry
 * degrades to value:0 rather than breaking the whole chart. */
export function resolveChartSeries(config: ChartSeriesConfig, entries: Record<string, any>[]): ChartPoint[] {
    if (config.mode === 'static') {
        return config.staticSeries ?? [];
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
