import { For, Show, createMemo } from 'solid-js';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  class?: string;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end   = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function DonutChart(props: DonutChartProps) {
  const size      = () => props.size ?? 120;
  const thickness = () => props.thickness ?? 28;
  const cx        = () => size() / 2;
  const cy        = () => size() / 2;
  const r         = () => (size() - thickness()) / 2;

  const total = createMemo(() => props.data.reduce((s, d) => s + (d.value || 0), 0));

  const slices = createMemo(() => {
    let cursor = 0;
    return props.data.map((d) => {
      const pct   = total() > 0 ? d.value / total() : 0;
      const sweep = pct * 360;
      const start = cursor;
      const end   = cursor + sweep - (sweep < 360 ? 0.5 : 0);
      cursor += sweep;
      return { ...d, start, end, pct };
    });
  });

  return (
    <div class={`flex flex-col items-center gap-3 ${props.class ?? ''}`}>
      <div class="relative" style={{ width: `${size()}px`, height: `${size()}px` }}>
        <Show
          when={total() > 0}
          fallback={
            <svg width={size()} height={size()} viewBox={`0 0 ${size()} ${size()}`}>
              <circle cx={cx()} cy={cy()} r={r()} fill="none" stroke="#f1f5f9" stroke-width={thickness()} />
            </svg>
          }
        >
          <svg width={size()} height={size()} viewBox={`0 0 ${size()} ${size()}`}>
            <For each={slices()}>
              {(s) => (
                <path
                  d={buildArcPath(cx(), cy(), r(), s.start, s.end)}
                  fill="none"
                  stroke={s.color}
                  stroke-width={thickness()}
                  stroke-linecap="butt"
                />
              )}
            </For>
          </svg>
        </Show>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span class="text-lg font-bold text-slate-700 leading-none">{total()}</span>
          <span class="text-[10px] text-slate-400 mt-0.5">tổng</span>
        </div>
      </div>

      <Show when={props.showLegend !== false}>
        <div class="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
          <For each={slices()}>
            {(s) => (
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                <span class="text-xs text-slate-600 whitespace-nowrap">{s.label} ({s.value})</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
