import { For, Show, createMemo } from 'solid-js';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  area?: boolean;
  dashed?: boolean;
}

export interface MiniLineChartProps {
  data: Record<string, number | null | string>[];
  dateKey?: string;
  series: ChartSeries[];
  height?: number;
  formatY?: (v: number) => string;
  formatDate?: (d: string) => string;
  class?: string;
}

const PAD = { top: 16, right: 16, bottom: 32, left: 52 };
const VW  = 600;

export function MiniLineChart(props: MiniLineChartProps) {
  const dateKey = () => props.dateKey ?? 'date';
  const VH      = () => props.height ?? 220;
  const innerW  = () => VW - PAD.left - PAD.right;
  const innerH  = () => VH() - PAD.top - PAD.bottom;

  const allValues = createMemo(() => {
    const vals: number[] = [];
    for (const row of props.data) {
      for (const s of props.series) {
        const v = row[s.key];
        if (v != null && typeof v === 'number') vals.push(v);
      }
    }
    return vals;
  });

  const minV = createMemo(() => Math.min(0, ...allValues()));
  const maxV = createMemo(() => Math.max(1, ...allValues()));

  const scaleX = createMemo(() => {
    const n = props.data.length;
    return (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW() : innerW() / 2);
  });

  const scaleY = createMemo(() => (v: number) => {
    const range = maxV() - minV();
    return PAD.top + innerH() - ((v - minV()) / (range || 1)) * innerH();
  });

  const buildPolyline = (seriesKey: string) =>
    props.data
      .map((row, i) => {
        const v = row[seriesKey];
        if (v == null || typeof v !== 'number') return null;
        return `${scaleX()(i)},${scaleY()(v)}`;
      })
      .filter(Boolean)
      .join(' ');

  const buildAreaPath = (seriesKey: string) => {
    const pts = props.data
      .map((row, i) => {
        const v = row[seriesKey];
        if (v == null || typeof v !== 'number') return null;
        return [scaleX()(i), scaleY()(v)] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);

    if (pts.length === 0) return '';
    const baseline = scaleY()(minV());
    return (
      `M ${pts[0][0]} ${baseline} ` +
      pts.map(([x, y]) => `L ${x} ${y}`).join(' ') +
      ` L ${pts[pts.length - 1][0]} ${baseline} Z`
    );
  };

  const yTicks = createMemo(() => {
    const range = maxV() - minV();
    const step  = range / 3;
    return [0, 1, 2, 3].map((i) => minV() + step * i);
  });

  const formatY  = () => props.formatY   ?? ((v: number) => v.toLocaleString('vi-VN'));
  const fmtDate  = () => props.formatDate ?? ((d: string) => d.slice(5));

  const xTicks = createMemo(() => {
    const n = props.data.length;
    const step = Math.max(1, Math.ceil(n / 7));
    const out: number[] = [];
    for (let i = 0; i < n; i += step) out.push(i);
    if (out.length > 0 && out[out.length - 1] !== n - 1) out.push(n - 1);
    return out;
  });

  return (
    <div class={`w-full ${props.class ?? ''}`} style={{ height: `${VH()}px` }}>
      <Show
        when={props.data.length > 0}
        fallback={
          <div class="flex items-center justify-center h-full text-slate-400 text-sm">
            Chưa có dữ liệu lịch sử
          </div>
        }
      >
        <svg viewBox={`0 0 ${VW} ${VH()}`} class="w-full h-full" preserveAspectRatio="none">
          <For each={yTicks()}>
            {(v) => (
              <>
                <line
                  x1={PAD.left} y1={scaleY()(v)}
                  x2={VW - PAD.right} y2={scaleY()(v)}
                  stroke="#f1f5f9" stroke-width="1"
                />
                <text
                  x={PAD.left - 4} y={scaleY()(v) + 4}
                  text-anchor="end" font-size="14" fill="#94a3b8"
                >
                  {formatY()(v)}
                </text>
              </>
            )}
          </For>

          <For each={xTicks()}>
            {(i) => (
              <text
                x={scaleX()(i)} y={VH() - 4}
                text-anchor="middle" font-size="13" fill="#94a3b8"
              >
                {fmtDate()((props.data[i][dateKey()] ?? '') as string)}
              </text>
            )}
          </For>

          <For each={props.series}>
            {(s) => (
              <>
                {s.area && (
                  <path d={buildAreaPath(s.key)} fill={s.color} fill-opacity="0.12" />
                )}
                <polyline
                  points={buildPolyline(s.key)}
                  fill="none"
                  stroke={s.color}
                  stroke-width="2"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  stroke-dasharray={s.dashed ? '5 4' : undefined}
                />
              </>
            )}
          </For>
        </svg>
      </Show>
    </div>
  );
}
