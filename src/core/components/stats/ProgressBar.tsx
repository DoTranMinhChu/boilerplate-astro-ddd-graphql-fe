import { Show } from 'solid-js';
import { mergeClass } from '@core/helpers/class';

export interface ProgressBarProps {
  percent: number | null | undefined;
  class?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  const pct = () => Math.min(100, Math.max(0, props.percent ?? 0));

  const barColor = () => {
    const p = pct();
    if (p >= 90) return 'bg-red-500';
    if (p >= 70) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <div class={mergeClass('w-full', props.class)}>
      <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          class={`h-full rounded-full transition-all duration-700 ${barColor()}`}
          style={{ width: `${pct()}%` }}
        />
      </div>
      <Show when={props.showLabel !== false}>
        <div class="text-xs text-slate-500 mt-1">
          {props.label ?? `${pct()}%`}
        </div>
      </Show>
    </div>
  );
}
